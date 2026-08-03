import { SurveyProvider } from "@/lib/survey-context";

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return <SurveyProvider>{children}</SurveyProvider>;
}
