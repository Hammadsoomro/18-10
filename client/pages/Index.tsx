import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  SortAsc,
  Zap,
  LayoutDashboard,
  Shield,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">J&A</span>
            </div>
            <span className="text-white font-bold text-lg">International</span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
              onClick={() => navigate("/signup")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Enterprise-Grade
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Contact Management
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Manage numbers, distribute contacts, and claim leads with real-time collaboration.
            Built for teams that demand precision and speed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold"
              onClick={() => navigate("/signup")}
            >
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          {[
            {
              icon: Shield,
              title: "JWT Authentication",
              description: "Secure token-based authentication with role-based access control",
            },
            {
              icon: LayoutDashboard,
              title: "Intelligent Dashboard",
              description: "Real-time indicators and live updates for all operations",
            },
            {
              icon: MessageCircle,
              title: "SMS Conversations",
              description: "Two-way SMS messaging with contact history and management",
            },
            {
              icon: SortAsc,
              title: "Numbers Sorter",
              description: "Input, deduplicate, and organize contact information efficiently",
            },
            {
              icon: Zap,
              title: "Auto Distributor",
              description: "Automatic distribution of leads with customizable intervals",
            },
            {
              icon: Users,
              title: "Team Management",
              description: "Admin controls to manage team members and permissions",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors"
            >
              <feature.icon className="h-10 w-10 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-800/20 border-y border-slate-800 py-20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            Why Choose J&A International?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              "Real-time WebSocket indicators for instant status updates",
              "Customizable claim cooldowns and distribution settings",
              "Complete team hierarchy with admin and member roles",
              "Persistent storage with MongoDB for reliability",
              "Beautiful, responsive UI for all devices",
              "Production-ready with hot reload development",
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-1" />
                <span className="text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { number: 1, title: "Sign Up", description: "Create your admin account" },
            {
              number: 2,
              title: "Add Numbers",
              description: "Input and sort contact information",
            },
            {
              number: 3,
              title: "Distribute",
              description: "Auto-distribute to team members",
            },
            {
              number: 4,
              title: "Track Results",
              description: "Monitor claims and conversations",
            },
          ].map((step) => (
            <div key={step.number} className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm">{step.description}</p>

              {step.number < 4 && (
                <div className="hidden md:block absolute top-6 -right-3 w-6 border-t-2 border-slate-700" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/20 rounded-2xl max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 my-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to revolutionize your contact management?
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            Join teams already using J&A International to manage thousands of leads efficiently.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold"
            onClick={() => navigate("/signup")}
          >
            Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <p>&copy; 2024 J&A International Karachi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
