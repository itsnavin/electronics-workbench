const SPACE = 2 ** 32;

export const subnetSources = [
  { title: 'RFC 4632: CIDR prefix notation', url: 'https://www.rfc-editor.org/rfc/rfc4632.html' },
  { title: 'RFC 3021: /31 point-to-point links', url: 'https://www.rfc-editor.org/rfc/rfc3021.html' },
  { title: 'RFC 1918: private address space', url: 'https://www.rfc-editor.org/rfc/rfc1918.html' },
  { title: 'IANA: IPv4 Special-Purpose Address Space', url: 'https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml' },
];

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
