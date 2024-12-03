import * as Icons from '../../icons'

export interface SVGIconProps extends React.SVGAttributes<HTMLElement> {
  icon: string;
}

const Icon: React.FC<SVGIconProps> = ({
  icon = 'Chat',
  ...props
}) => {
  const SVG = (Icons as any)[icon];

  if (!SVG) {
    console.error(`Icon "${icon}" does not exist in the Icons object.`);
    return null; // or return a default icon or placeholder
  }

  return <SVG {...props} />;
};

export default Icon;
