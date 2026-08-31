import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useUnsaved } from "@/hooks/useUnsaved";

export function SafeLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { isDirty, requestNavigation } = useUnsaved();
  const navigate = useNavigate();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDirty) {
      navigate({ to });
      return;
    }

    await requestNavigation(to);
  };

  return (
    // keep Link for styling semantics but intercept clicks
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
