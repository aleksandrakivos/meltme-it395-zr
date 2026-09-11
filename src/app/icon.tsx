import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const cream = "#faf6ef";
const amber = "#c48932";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: amber,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 32 32" fill={cream}>
          <path
            fillRule="evenodd"
            d="M16 1.6c2.6 3.2 4.3 6 4.3 8.6 0 2.4-1.9 4.2-4.3 4.2s-4.3-1.8-4.3-4.2c0-2.6 1.7-5.4 4.3-8.6ZM16 5.8c1.25 1.55 2 2.9 2 4.05 0 1.15-.9 2-2 2s-2-.85-2-2c0-1.15.75-2.5 2-4.05Z"
          />
          <rect x="15.1" y="13.6" width="1.8" height="3.6" rx="0.8" />
          <rect x="9.2" y="16.6" width="13.6" height="2.5" rx="0.35" />
          <path
            fillRule="evenodd"
            d="M11 19.2h10l1.35 8.55c.16 1-.66 1.85-1.68 1.85H11.33c-1.02 0-1.84-.85-1.68-1.85L11 19.2ZM12.6 22.35h6.8v1.3h-6.8Z"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
