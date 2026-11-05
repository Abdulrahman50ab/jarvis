import Image from "next/image";

export default function JarvisLogo({
  className = "h-10 w-10",
  alt = "JARVIS logo",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src="/jarvis-logo.svg"
      alt={alt}
      width={64}
      height={64}
      className={`shrink-0 rounded-[22%] ${className}`}
    />
  );
}
