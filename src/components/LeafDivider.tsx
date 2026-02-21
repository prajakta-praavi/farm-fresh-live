import { Link } from "react-router-dom";

const LeafIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66L7 19c4-4 8-5 11-5 1 0 2-.5 2-2s-1-2-2-2c-1 0-3 .5-5 2-2 1.5-3 3-3.5 4.5" />
    <path d="M20 4c-1 0-3.5.5-6 2.5S10 11 9.5 13c3-4 7.5-6 10.5-6 1 0 2-.5 2-1.5S21 4 20 4z" opacity="0.5" />
  </svg>
);

export const LeafDivider = () => (
  <div className="leaf-divider">
    <LeafIcon className="w-6 h-6 text-leaf opacity-60" />
  </div>
);

export default LeafDivider;
