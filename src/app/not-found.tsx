import { MapPinOff } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <StateMessage
        icon={MapPinOff}
        headingLevel="h1"
        title="We couldn't find that page"
        description="The destination or story may not exist, or it hasn't been published."
      >
        <Link href="/" className={buttonClasses("secondary")}>
          Back to Explore
        </Link>
      </StateMessage>
    </div>
  );
}
