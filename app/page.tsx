import RecordList from "@/components/RecordList";
import WorkshopIntro from "@/components/WorkshopIntro";

// Content waits for the signed-in user (see Shell), so there is nothing to validate on the server.
export const instant = false;

export default function Home() {
  return (
    <>
      <WorkshopIntro />
      <RecordList />
    </>
  );
}
