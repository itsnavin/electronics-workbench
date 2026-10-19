import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIPv4, ipv4, parsePrefix, maskPrefix, prefixMask, binaryIPv4, subnet, addressScope, subnetSources } from '../subnet.js';

test('strict decimal IPv4 parsing and unsigned arithmetic', () => {
  for (const ip of ['0.0.0.0', '127.0.0.1', '128.0.0.1', '192.168.1.10', '255.255.255.255']) assert.equal(ipv4(parseIPv4(ip)), ip);
  assert.equal(parseIPv4('255.255.255.255'), 4294967295);
  for (const ip of ['', '1', '1.2.3', '1.2.3.4.5', '256.1.1.1', '-1.2.3.4', '1.2.3.4x', '01.2.3.4', '1..3.4', '1.2.3. 4', '1e1.2.3.4', '0xff.1.1.1']) assert.throws(() => parseIPv4(ip));
  for (const n of [-1, 2 ** 32, 1.5, Infinity, NaN]) assert.throws(() => ipv4(n));
});

test('prefixes and contiguous masks are bijective over all 33 sizes', () => {
  for (let prefix = 0; prefix <= 32; prefix++) assert.equal(maskPrefix(prefixMask(prefix)), prefix);
  assert.equal(prefixMask(0), '0.0.0.0');
  assert.equal(prefixMask(1), '128.0.0.0');
  assert.equal(prefixMask(31), '255.255.255.254');
  assert.equal(prefixMask(32), '255.255.255.255');
  for (const p of ['', ' ', '-1', '33', '24.5', '24abc', '/24', '2e1', '+24', '024', Infinity]) assert.throws(() => parsePrefix(p));
  for (const mask of ['255.0.255.0', '255.255.255.1', '255.255.255.253', '0.0.0.1', '127.0.0.0', '255.255.256.0']) assert.throws(() => maskPrefix(mask));
});

test('known /24 and high-bit /20 subnet vectors', () => {
  const result = subnet('192.168.1.10', 24);
  assert.equal(result.network, '192.168.1.0');
  assert.equal(result.broadcast, '192.168.1.255');
  assert.equal(result.mask, '255.255.255.0');
  assert.equal(result.wildcard, '0.0.0.255');
  assert.equal(result.total, 256);
  assert.equal(result.usable, 254);
  assert.equal(result.firstHost, '192.168.1.1');
  assert.equal(result.lastHost, '192.168.1.254');
  const high = subnet('200.123.45.67', 20);
  assert.equal(high.network, '200.123.32.0');
  assert.equal(high.broadcast, '200.123.47.255');
  assert.equal(high.total, 4096);
});

test('/0, /1 and /30 boundary arithmetic has no signed wraparound', () => {
  const all = subnet('255.255.255.255', 0);
  assert.equal(all.network, '0.0.0.0');
  assert.equal(all.total, 4294967296);
  assert.equal(all.usable, 4294967294);
  assert.equal(all.broadcast, '255.255.255.255');
  assert.equal(all.firstHost, '0.0.0.1');
  assert.equal(all.lastHost, '255.255.255.254');
  assert.equal(subnet('128.0.0.1', 1).network, '128.0.0.0');
  assert.equal(subnet('128.0.0.1', 1).total, 2147483648);
  assert.equal(subnet('127.255.255.255', 1).broadcast, '127.255.255.255');
  const small = subnet('192.0.2.5', 30);
  assert.equal(small.network, '192.0.2.4');
  assert.equal(small.firstHost, '192.0.2.5');
  assert.equal(small.lastHost, '192.0.2.6');
  assert.equal(small.broadcast, '192.0.2.7');
  assert.equal(small.usable, 2);
});

test('/31 point-to-point and /32 single-host semantics', () => {
  for (const ip of ['192.0.2.10', '192.0.2.11']) {
    const r = subnet(ip, 31);
    assert.equal(r.network, '192.0.2.10');
    assert.equal(r.firstHost, '192.0.2.10');
    assert.equal(r.lastHost, '192.0.2.11');
    assert.equal(r.broadcast, null);
    assert.equal(r.total, 2); assert.equal(r.usable, 2);
    assert.match(r.semantics, /RFC 3021/);
  }
  const host = subnet('255.255.255.255', 32);
  assert.equal(host.network, '255.255.255.255');
  assert.equal(host.firstHost, host.lastHost);
  assert.equal(host.broadcast, null);
  assert.equal(host.usable, 1);
  assert.equal(host.wildcard, '0.0.0.0');
  assert.match(host.scope, /Reserved/);
  assert.match(host.semantics, /single-host/);
});

test('deterministic property checks for every prefix across IPv4 space', () => {
  let seed = 123456789;
  for (let prefix = 0; prefix <= 32; prefix++) {
    for (let i = 0; i < 100; i++) {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      const result = subnet(ipv4(seed), prefix);
      const start = parseIPv4(result.network), end = parseIPv4(result.last);
      assert.ok(start <= seed && end >= seed);
      assert.equal(start % result.total, 0);
      assert.equal(end - start + 1, result.total);
      assert.equal(parseIPv4(result.mask) + parseIPv4(result.wildcard), 2 ** 32 - 1);
      assert.equal(result.usable, prefix >= 31 ? result.total : result.total - 2);
      assert.equal(subnet(result.network, prefix).network, result.network);
      assert.equal(subnet(result.last, prefix).network, result.network);
    }
  }
});

test('scope is not a public/reachable claim and private boundaries are exact', () => {
  for (const ip of ['10.0.0.0', '10.255.255.255', '172.16.0.0', '172.31.255.255', '192.168.255.255']) assert.match(addressScope(ip), /^RFC 1918 private/);
  for (const ip of ['9.255.255.255', '11.0.0.0', '172.15.255.255', '172.32.0.0', '192.169.0.0', '8.8.8.8']) assert.match(addressScope(ip), /^Not RFC 1918 private/);
  for (const [ip, label] of [['127.1.2.3', 'loopback'], ['169.254.1.2', 'link-local'], ['100.64.0.1', 'shared'], ['192.0.2.1', 'documentation'], ['198.18.0.1', 'benchmarking'], ['224.0.0.1', 'Multicast']]) assert.ok(addressScope(ip).includes(label));
  assert.equal(subnetSources.length, 4);
  assert.ok(subnetSources.every(source => /^https:\/\/(www.rfc-editor.org|www.iana.org)\//.test(source.url)));
});

test('binary visualization has exactly 32 bits with octet delimiters', () => {
  assert.equal(binaryIPv4('192.168.1.10'), '11000000.10101000.00000001.00001010');
  assert.equal(binaryIPv4('0.0.0.0'), '00000000.00000000.00000000.00000000');
  assert.equal(binaryIPv4('255.255.255.255'), '11111111.11111111.11111111.11111111');
});
