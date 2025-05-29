import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { User, Calendar, Mail, ExternalLink, Edit, ArrowLeft } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";

interface ProfilePageProps {
  userId?: string;
  readOnly?: boolean;
}

export default function Profile({ userId, readOnly = false }: ProfilePageProps) {
  const { user: currentUser } = useAuth();
  
  // For now, we'll display the current user's profile
  // In a real implementation, you might fetch a specific user's profile based on userId
  const user = currentUser;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
              <p className="text-sm text-gray-500 mb-4">
                The profile you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link href="/">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` || "U";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User";
  const isOwnProfile = !userId || userId === user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                {isOwnProfile ? "My Profile" : `${fullName}'s Profile`}
              </h1>
            </div>
            {isOwnProfile && !readOnly && (
              <Link href="/">
                <Button size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                    <AvatarImage 
                      src={user.profileImageUrl || ""} 
                      alt={fullName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 truncate">
                        {fullName}
                      </h1>
                      <div className="flex items-center space-x-2 mt-1">
                        {user.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-1" />
                            {user.email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {user.isAdmin && (
                          <Badge variant="outline">Admin</Badge>
                        )}
                      </div>
                    </div>

                    {/* Join Date */}
                    {user.createdAt && (
                      <div className="flex items-center text-sm text-gray-500 mt-4 sm:mt-0">
                        <Calendar className="h-4 w-4 mr-1" />
                        Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio Section */}
          {user.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {user.bio}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Contact & Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact & Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Email */}
                {user.email && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <a 
                        href={`mailto:${user.email}`}
                        className="text-sm text-primary hover:text-blue-700 flex items-center"
                      >
                        {user.email}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  </div>
                )}

                {/* LinkedIn */}
                {user.linkedinProfile && (
                  <>
                    {user.email && <Separator />}
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FaLinkedin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">LinkedIn</p>
                        <a 
                          href={user.linkedinProfile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-blue-700 flex items-center"
                        >
                          View LinkedIn Profile
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </>
                )}

                {/* Empty state */}
                {!user.email && !user.linkedinProfile && (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No contact information available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Stats (if admin or own profile) */}
          {(user.isAdmin || isOwnProfile) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
                <CardDescription>
                  Account details and activity information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">User ID</p>
                    <p className="text-sm text-gray-500 font-mono">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Status</p>
                    <p className="text-sm text-gray-500">
                      {user.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Updated</p>
                    <p className="text-sm text-gray-500">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
