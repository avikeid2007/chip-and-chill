import { Link } from "react-router-dom";

// Shown on admin pages when the logged-in user has no course linked.
export default function NoCourse() {
  return (
    <div className="bg-white border border-[#E4E8E3] rounded-md p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-turf/10 text-turf flex items-center justify-center mx-auto mb-4 text-2xl">⛳</div>
      <h2 className="text-lg font-semibold text-fairway mb-2">No course yet</h2>
      <p className="text-sm text-ink-soft mb-5 max-w-sm mx-auto">
        This page manages a specific course, but your account isn't linked to one yet.
      </p>
      <Link
        to="/create-course"
        className="inline-block bg-gold text-fairway px-6 py-2.5 rounded-[3px] font-semibold text-sm"
      >
        Create your course
      </Link>
    </div>
  );
}
