import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Zap, UserPlus, Eye, Code } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">ProfileHub</h1>
            </div>
            <div className="flex items-center">
              <Button onClick={handleLogin} className="bg-primary hover:bg-blue-700">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Manage Your
            <span className="text-primary"> Professional Profile</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A comprehensive platform for managing user profiles with authentication, 
            admin controls, and API access. Perfect for modern applications.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-blue-700">
              Get Started
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* User Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>User Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Complete profile management with personal information, bio, 
                  LinkedIn integration, and profile picture uploads.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Profile Editing</Badge>
                  <Badge variant="secondary">Image Upload</Badge>
                  <Badge variant="secondary">LinkedIn</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-green-600" />
                  <CardTitle>Secure Authentication</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Built-in authentication system with role-based access control 
                  and secure session management.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">OAuth Integration</Badge>
                  <Badge variant="secondary">Role-based Access</Badge>
                  <Badge variant="secondary">Session Security</Badge>
                </div>
              </CardContent>
            </Card>

            {/* API Access */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Code className="h-6 w-6 text-orange-600" />
                  <CardTitle>API Integration</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  RESTful API endpoints with API key authentication for 
                  external integrations and third-party applications.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">REST API</Badge>
                  <Badge variant="secondary">API Keys</Badge>
                  <Badge variant="secondary">Documentation</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Admin Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Eye className="h-6 w-6 text-purple-600" />
                  <CardTitle>Admin Dashboard</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive admin interface for user management, 
                  analytics, and system monitoring.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">User Analytics</Badge>
                  <Badge variant="secondary">System Stats</Badge>
                  <Badge variant="secondary">User Control</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Zap className="h-6 w-6 text-yellow-600" />
                  <CardTitle>High Performance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Built with modern technologies for optimal performance, 
                  scalability, and user experience.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">React</Badge>
                  <Badge variant="secondary">PostgreSQL</Badge>
                  <Badge variant="secondary">Express.js</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Easy Setup */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                  <CardTitle>Quick Setup</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get started in minutes with our streamlined onboarding 
                  process and intuitive user interface.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Quick Start</Badge>
                  <Badge variant="secondary">Intuitive UI</Badge>
                  <Badge variant="secondary">Documentation</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Join thousands of users who trust ProfileHub for their profile management needs.
          </p>
          <div className="mt-8">
            <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-blue-700">
              Start Managing Profiles Today
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
