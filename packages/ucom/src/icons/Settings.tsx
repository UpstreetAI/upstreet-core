import type { SVGProps } from 'react'
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgSettings = ({
  title,
  titleId,
  ...props
}: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    data-name="Layer 1"
    viewBox="0 0 800 800"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="m614.4 347.8 102.2 52-18.1 116-118.2 10-34.1 36 4 120-82.2 42-76-101.7-54.1-14.4-106.2 68-82.1-63.9 60.1-116-16-43.2-118.2-62.8 22.1-110 122.2-6 26.1-30-16.1-98 105.3-62.1 67 96 64 8 96.3-64.2 96.8 70.2-60.7 112 15.9 41.9Zm-126.5-1.1-62.5-37.4-67.8 15.6-43.4 57.2 12.2 55.5 62.5 46.8 76.4-20.8 34.7-60.1-12.2-56.9Z"
      className="settings_svg__cls-1"
    />
  </svg>
)
export default SvgSettings
