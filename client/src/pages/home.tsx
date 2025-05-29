import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import ProfileForm from "@/components/profile-form";
import AdminPanel from "@/components/admin-panel";
import ApiDocumentation from "@/components/api-documentation";

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("profile")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "profile"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                My Profile
              </button>
              <button
                onClick={() => setActiveTab("api")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "api"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                API Access
              </button>
              {user.isAdmin && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "admin"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Admin Panel
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && <ProfileForm />}
        {activeTab === "api" && <ApiDocumentation />}
        {activeTab === "admin" && user.isAdmin && <AdminPanel />}
      </div>
    </div>
  );
}
