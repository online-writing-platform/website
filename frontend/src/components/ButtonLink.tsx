import { Link } from "react-router-dom";
import "./ButtonLink.css";

type ButtonLinkProps = {
  to: string;
  children: React.ReactNode;
};

function ButtonLink({ to, children }: ButtonLinkProps) {
  return (
    <Link to={to} className="button-link">
      {children}
    </Link>
  );
}

export default ButtonLink;
