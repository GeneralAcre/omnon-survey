import { RequireUser } from "@/components/Shell";

// The survey pages ask who is surveying first; the landing and About stay public.
export default function SurveyLayout({ children }: LayoutProps<"/">) {
  return <RequireUser>{children}</RequireUser>;
}
