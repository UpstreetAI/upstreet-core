import type { SVGProps } from 'react'
interface SVGRProps {
  title?: string;
  titleId?: string;
}
const SvgNudge = ({
  title,
  titleId,
  ...props
}: SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 800 800"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="m720.9 384.2-112.8-11-3.6-39.2 112.2-38.7 9.3 71.4zm-45.4 160-30.1 21.9-77.8-88.5 29.9-38.5 88.7 65.1-10.7 39.9ZM551.6 278.3l1.9-112.1 64.1 6.3 3 4.2-23.1 108.8zm1.9 58.1 14.4 36.8-14.1 53.5-185.1 5.7 80.6 10.3 10.4 49.3-10.4 52.1h-80.6l50.4 7.1 10.5 39.6-19.8 42H74.4v-29.6L74 332.7l59.3 1.3 185.8-161 49.7 22.8 11.5 49.4-89.2 91.3h262.4Z"
      className="nudge_svg__st0"
    />
  </svg>
)
export default SvgNudge
