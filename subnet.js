const SPACE = 2 ** 32;

export const subnetSources = [
  { title: 'RFC 4632: CIDR prefix notation', url: 'https://www.rfc-editor.org/rfc/rfc4632.html' },
  { title: 'RFC 3021: /31 point-to-point links', url: 'https://www.rfc-editor.org/rfc/rfc3021.html' },
  { title: 'RFC 1918: private address space', url: 'https://www.rfc-editor.org/rfc/rfc1918.html' },
  { title: 'IANA: IPv4 Special-Purpose Address Space', url: 'https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml' },
];
export const gatewaySource = { title: 'ip-route manual: route display, lookup and onlink semantics', url: 'https://man7.org/linux/man-pages/man8/ip-route.8.html' };

export function gatewayInfo(addressText, prefixText, gatewayText = '') {
  const block = subnet(addressText, prefixText);
  const address = parseIPv4(block.address);
  const start = parseIPv4(block.network), end = parseIPv4(block.last);
  const privateBlocks = [['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16]];
  const inOnePrivateBlock = privateBlocks.some(([ip, prefix]) => {
    const base = parseIPv4(ip);
    return start >= base && end < base + 2 ** (32 - prefix);
  });
  const suggestions = block.prefix <= 30 && inOnePrivateBlock && address > start && address < end
    ? [...new Set([block.firstHost, block.lastHost])].filter(ip => ip !== block.address) : [];
  const result = (status, message, supplied = null) => ({ status, message, supplied, suggestions });
  if (!String(gatewayText).trim()) {
    return result('unknown', 'Configured gateway: unknown. IP and mask cannot determine it, and this static website cannot discover it.');
  }
  let gateway;
  try { gateway = parseIPv4(gatewayText); }
  catch (error) { return result('invalid', `Gateway syntax: ${error.message}`); }
  const supplied = ipv4(gateway);
  if (gateway === address) return result('invalid', 'Gateway equals the entered local address; it is not a distinct next-hop router. Verify the local address and routing configuration.', supplied);
  if (gateway < 2 ** 24 || Math.floor(gateway / 2 ** 24) === 127 || gateway >= parseIPv4('224.0.0.0')) {
    return result('invalid', 'Not an ordinary unicast next-hop address: unspecified/this-network, loopback, multicast, reserved or limited-broadcast space. Check actual route semantics, not just subnet membership.', supplied);
  }
  if (block.prefix === 32) {
    return result('conditional', '/32 has no distinct in-subnet peer. An external gateway may work with an explicit host/on-link route or point-to-point configuration; this calculator cannot verify that configuration.', supplied);
  }
  if (gateway < start || gateway > end) {
    return result('conditional', 'Outside the calculated subnet: fails the usual directly connected gateway check. Explicit on-link/host routes or point-to-point configuration can be exceptions; verify actual routes rather than assuming this can never work.', supplied);
  }
  if (block.prefix <= 30 && (gateway === start || gateway === end)) {
    return result('invalid', 'This is the conventional network or directed-broadcast address, not a usable gateway host under the selected subnet model.', supplied);
  }
  if (block.prefix <= 30 && (address === start || address === end)) {
    return result('conditional', 'The entered local address is the conventional network or broadcast address. Correct/verify the local host configuration before treating this gateway check as meaningful.', supplied);
  }
  if (block.prefix === 0) return result('conditional', '/0 contains all IPv4 addresses; membership alone does not establish an on-link gateway. Verify the real interface prefix and routes. No gateway convention is suggested.', supplied);
  if (block.prefix === 31) return result('conditional', 'This is the other /31 endpoint. It can be a next hop on a supporting RFC 3021 point-to-point link; it is not a discovered or confirmed default gateway.', supplied);
  if (!addressScope(supplied).startsWith('RFC 1918 private') && !addressScope(supplied).startsWith('Not RFC 1918 private')) {
    return result('conditional', 'Within the conventional host range, but the gateway is in a selected special-use block. Purpose-specific routing restrictions apply; this is not a recommendation or reachability check.', supplied);
  }
  return result('plausible', 'Within the conventional host range and distinct from the local address. Passes arithmetic checks only: not evidence that a router exists, is configured as your gateway, or is reachable.', supplied);
}

export function parseIPv4(value) {
  const text = String(value).trim();
  const octets = text.split('.');
  if (octets.length !== 4 || octets.some(part => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) {
    throw new Error('Enter four decimal IPv4 octets from 0 to 255, without leading zeros (example: 192.168.1.10).');
  }
  return octets.reduce((total, octet) => total * 256 + Number(octet), 0);
}

export function ipv4(value) {
  if (!Number.isInteger(value) || value < 0 || value >= SPACE) throw new Error('IPv4 number is out of range.');
  return [24, 16, 8, 0].map(bits => Math.floor(value / 2 ** bits) % 256).join('.');
}

export function parsePrefix(value) {
  const text = String(value).trim();
  if (!/^(0|[1-9]\d?)$/.test(text) || Number(text) > 32) throw new Error('CIDR prefix must be a whole number from 0 to 32 (without /).');
  return Number(text);
}

export function prefixMask(value) {
  const prefix = parsePrefix(value);
  return ipv4(SPACE - 2 ** (32 - prefix));
}

export function maskPrefix(value) {
  const mask = parseIPv4(value);
  const block = SPACE - mask;
  const hostBits = Math.log2(block);
  if (!Number.isInteger(hostBits)) throw new Error('Subnet mask must contain contiguous 1 bits followed by 0 bits.');
  return 32 - hostBits;
}

export function binaryIPv4(value) {
  return ipv4(parseIPv4(value)).split('.').map(octet => Number(octet).toString(2).padStart(8, '0')).join('.');
}

export function addressScope(value) {
  const address = parseIPv4(value);
  const within = (network, prefix) => Math.floor(address / 2 ** (32 - prefix)) === Math.floor(parseIPv4(network) / 2 ** (32 - prefix));
  if (within('10.0.0.0', 8) || within('172.16.0.0', 12) || within('192.168.0.0', 16)) {
    return 'RFC 1918 private address. Not globally routed; local routing/NAT depends on configuration.';
  }
  // Selected broad categories only, not a copy of the evolving IANA registry.
  const categories = [
    ['0.0.0.0', 8, 'Special-use: this-network / unspecified space'],
    ['100.64.0.0', 10, 'Special-use: shared address space (carrier-grade NAT), not RFC 1918'],
    ['127.0.0.0', 8, 'Special-use: loopback'],
    ['169.254.0.0', 16, 'Special-use: link-local'],
    ['192.0.0.0', 24, 'Special-use: IETF protocol assignments; individual exceptions exist'],
    ['192.0.2.0', 24, 'Special-use: documentation TEST-NET-1'],
    ['198.18.0.0', 15, 'Special-use: benchmarking'],
    ['198.51.100.0', 24, 'Special-use: documentation TEST-NET-2'],
    ['203.0.113.0', 24, 'Special-use: documentation TEST-NET-3'],
    ['224.0.0.0', 4, 'Multicast, not ordinary unicast host space'],
    ['240.0.0.0', 4, 'Reserved space (includes limited broadcast 255.255.255.255)'],
  ];
  const match = categories.find(([network, prefix]) => within(network, prefix));
  return match ? `${match[2]}. Consult IANA for exact purpose and exceptions.` :
    'Not RFC 1918 private. This is not a claim of public allocation or reachability; other special-use assignments exist. Check IANA and your network policy.';
}

export function subnet(addressText, prefixText) {
  const address = parseIPv4(addressText);
  const prefix = parsePrefix(prefixText);
  const total = 2 ** (32 - prefix);
  const network = Math.floor(address / total) * total;
  const last = network + total - 1;
  const special = prefix >= 31;
  return {
    address: ipv4(address), prefix, network: ipv4(network), mask: prefixMask(prefix),
    wildcard: ipv4(total - 1), last: ipv4(last), broadcast: special ? null : ipv4(last),
    total, usable: special ? total : total - 2,
    firstHost: ipv4(special ? network : network + 1),
    lastHost: ipv4(special ? last : last - 1),
    semantics: prefix === 31
      ? '/31: two endpoint addresses on an RFC 3021 point-to-point link; no directed broadcast. Both ends must support this use, not a normal multi-access LAN.'
      : prefix === 32
        ? '/32: one single-host address/route; no separate network or directed-broadcast address and no on-link peer range.'
        : 'Conventional subnet arithmetic: network and directed broadcast excluded from host range. Counts are address slots, not proof every address is assignable or usable.',
    scope: addressScope(addressText),
  };
}
