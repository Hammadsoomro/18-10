import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <p className="text-2xl font-semibold text-white mb-2">Page Not Found</p>
          <p className="text-slate-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8 mb-8">
          <p className="text-sm text-slate-400 break-all font-mono mb-4">
            {location.pathname}
          </p>
        </div>

        <Button
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white w-full"
        >
          <Home className="h-4 w-4 mr-2" />
          Return to Home
        </Button>

        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full mt-3"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
