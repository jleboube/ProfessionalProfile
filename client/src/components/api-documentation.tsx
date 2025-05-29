import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Eye, EyeOff, Copy, RefreshCw, Plus, ChevronDown, Code } from "lucide-react";
import type { ApiKey } from "@shared/schema";

export default function ApiDocumentation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/keys", { name });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Created",
        description: `New API key "${data.apiKey.name}" has been created.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      setIsCreateModalOpen(false);
      setNewKeyName("");
      // Temporarily reveal the new key
      setRevealedKeys(prev => new Set([...prev, data.key]));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Regenerate API key mutation
  const regenerateApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("POST", `/api/keys/${keyId}/regenerate`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Regenerated",
        description: "Your API key has been regenerated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      // Temporarily reveal the new key
      setRevealedKeys(prev => new Set([...prev, data.key]));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate API key",
        variant: "destructive",
      });
    },
  });

  const toggleKeyVisibility = (keyId: string) => {
    setRevealedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const maskApiKey = (key: string) => {
    if (key.length < 8) return key;
    return `${key.substring(0, 8)}${"•".repeat(key.length - 8)}`;
  };

  const handleCreateApiKey = () => {
    if (newKeyName.trim()) {
      createApiKeyMutation.mutate(newKeyName.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* API Credentials Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Credentials</CardTitle>
              <CardDescription>
                Manage your API credentials and view documentation.
              </CardDescription>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Give your API key a descriptive name to help you remember what it's for.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key-name">API Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., My Mobile App"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateApiKey}
                      disabled={!newKeyName.trim() || createApiKeyMutation.isPending}
                    >
                      {createApiKeyMutation.isPending ? "Creating..." : "Create Key"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading API keys...</div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Label className="text-sm font-medium">{apiKey.name}</Label>
                        {apiKey.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                          {revealedKeys.has(apiKey.id) ? 
                            `pk_live_${apiKey.id}` : // This is a placeholder, actual key would be stored differently
                            maskApiKey(`pk_live_${apiKey.id}`)
                          }
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {revealedKeys.has(apiKey.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`pk_live_${apiKey.id}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {apiKey.lastUsed && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateApiKeyMutation.mutate(apiKey.id)}
                      disabled={regenerateApiKeyMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No API keys found</p>
              <p className="text-sm text-gray-400">Create your first API key to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Documentation for available API endpoints and their usage.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* GET Profile */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Badge className="bg-green-100 text-green-800">GET</Badge>
                  <code className="text-sm font-mono">/api/v1/profile</code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Retrieve user profile</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 border-l border-r border-b border-gray-200 rounded-b-lg">
                <p className="text-sm text-gray-600 mb-3">
                  Retrieve the authenticated user's profile information.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Headers</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      <code>{`X-API-Key: your_api_key_here`}</code>
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Response</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      <code>{`{
  "id": "user_123",
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Software engineer...",
  "linkedinProfile": "https://linkedin.com/in/johndoe",
  "profilePicture": "https://example.com/photos/user_123.jpg",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:25:00Z"
}`}</code>
                    </pre>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* PUT Profile */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Badge className="bg-blue-100 text-blue-800">PUT</Badge>
                  <code className="text-sm font-mono">/api/v1/profile</code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Update user profile</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 border-l border-r border-b border-gray-200 rounded-b-lg">
                <p className="text-sm text-gray-600 mb-3">
                  Update the authenticated user's profile information.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Headers</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      <code>{`X-API-Key: your_api_key_here
Content-Type: application/json`}</code>
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Request Body</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      <code>{`{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio text...",
  "linkedinProfile": "https://linkedin.com/in/johndoe"
}`}</code>
                    </pre>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* POST Profile Picture */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Badge className="bg-orange-100 text-orange-800">POST</Badge>
                  <code className="text-sm font-mono">/api/v1/profile/picture</code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Upload profile picture</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 border-l border-r border-b border-gray-200 rounded-b-lg">
                <p className="text-sm text-gray-600 mb-3">
                  Upload a new profile picture (multipart/form-data).
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Headers</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      <code>{`X-API-Key: your_api_key_here
Content-Type: multipart/form-data`}</code>
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Form Data</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      <code>{`picture: [image file]`}</code>
                    </pre>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
