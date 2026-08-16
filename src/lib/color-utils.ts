export const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

export function getContrastText(hexColor: string): "#FFFFFF" | "#172033" {
  if (!isValidHexColor(hexColor)) return "#172033";
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.58 ? "#172033" : "#FFFFFF";
}
