import { Link } from "react-router-dom";
import "./Button.css";

interface ButtonProps {
  children: React.ReactNode;

  to?: string;

  onClick?: () => void;

  type?: "button" | "submit" | "reset";

  variant?: "primary" | "secondary" | "danger";

  disabled?: boolean;
}

function Button({
  children,
  to,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  const className = `button button-${variant}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
