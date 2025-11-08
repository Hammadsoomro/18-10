import * as React from "react";
import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  active?: boolean;
}

export function TeamCard({ member }: { member: TeamMember }) {
  const [flipped, setFlipped] = React.useState(false);

  return (
    <div className={cn("relative w-full max-w-sm mx-auto perspective-1000")}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((s) => !s)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((s) => !s);
          }
        }}
        aria-pressed={flipped}
        className="group w-full h-48 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg relative focus:outline-none cursor-pointer"
      >
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-500 transform preserve-3d rounded-2xl",
            flipped ? "rotate-y-180" : "",
          )}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase opacity-80">Team Member</div>
                <div className="mt-2 font-semibold text-lg truncate">
                  {member.name}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-md flex items-center justify-center">
                  <Avatar name={member.name} size={36} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm opacity-90">
              <div>
                <div className="text-xs">Role</div>
                <div className="font-mono">Member</div>
              </div>

              <div className="text-right">
                <div className="text-xs">Status</div>
                <div className="font-mono">
                  {member.active ? "Active" : "Offline"}
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 rotate-y-180 backface-hidden rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 p-5 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
            <div>
              <div className="text-sm font-semibold">{member.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {member.email || "No email"}
              </div>

              <div className="mt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Claims</span>
                  <span className="font-mono">0</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-500 text-xs">Active Since</span>
                  <span className="font-mono">—</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button className="px-3 py-2 bg-slate-800 text-white rounded-md text-sm">
                Message
              </button>
              <button className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm">
                Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamCard;
