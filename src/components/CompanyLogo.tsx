import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";

type CompanyLogoProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  iconSize?: number;
};

export function CompanyLogo({
  src,
  alt = "Company logo",
  className,
  fallbackClassName,
  iconSize = 24,
}: CompanyLogoProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        // default: larger on screen, much larger when printing
        className={cn("object-contain h-12 w-auto print:h-36 print:w-auto", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        // default size and larger for printouts
        "grid place-items-center rounded-xl bg-sidebar-primary/12 ring-1 ring-sidebar-primary/30 h-12 w-12 print:h-36 print:w-36",
        fallbackClassName,
      )}
    >
      <Gem size={iconSize} className="text-sidebar-primary" />
    </div>
  );
}
