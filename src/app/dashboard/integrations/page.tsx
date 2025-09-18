"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Plus,
  Check,
  X,
  ExternalLink,
  Settings,
  RefreshCw,
  AlertCircle,
  Upload,
  Download,
  Play,
  Video,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isConnected: boolean;
  connectedAt?: string;
  settings?: {
    [key: string]: any;
  };
  features: string[];
  status: "active" | "inactive" | "error";
}

// Credential requirements for each integration
const credentialRequirements: {[key: string]: {label: string, type: string, required: boolean, placeholder?: string}[]} = {
  'youtube': [
    {label: 'API Key', type: 'password', required: true, placeholder: 'Your YouTube Data API v3 key'},
    {label: 'Channel ID', type: 'text', required: true, placeholder: 'Your YouTube channel ID'},
    {label: 'Client ID', type: 'text', required: false, placeholder: 'OAuth Client ID (optional)'},
  ],
  'vimeo': [
    {label: 'Access Token', type: 'password', required: true, placeholder: 'Your Vimeo access token'},
    {label: 'Client ID', type: 'text', required: true, placeholder: 'Your Vimeo app client ID'},
    {label: 'Client Secret', type: 'password', required: true, placeholder: 'Your Vimeo app client secret'},
  ],
  'slack': [
    {label: 'Bot Token', type: 'password', required: true, placeholder: 'xoxb-your-bot-token'},
    {label: 'Channel ID', type: 'text', required: true, placeholder: 'Channel ID for notifications'},
    {label: 'Webhook URL', type: 'text', required: false, placeholder: 'Webhook URL for alerts (optional)'},
  ],
  'dropbox': [
    {label: 'App Key', type: 'text', required: true, placeholder: 'Your Dropbox app key'},
    {label: 'App Secret', type: 'password', required: true, placeholder: 'Your Dropbox app secret'},
    {label: 'Access Token', type: 'password', required: true, placeholder: 'Generated access token'},
  ],
  'adobe-creative': [
    {label: 'API Key', type: 'password', required: true, placeholder: 'Adobe Creative SDK API key'},
    {label: 'Organization ID', type: 'text', required: true, placeholder: 'Your Adobe organization ID'},
    {label: 'Technical Account ID', type: 'text', required: false, placeholder: 'Technical account ID (optional)'},
  ],
  'zapier': [
    {label: 'Webhook URL', type: 'text', required: true, placeholder: 'Zapier webhook URL'},
    {label: 'API Key', type: 'password', required: false, placeholder: 'API key for advanced features (optional)'},
  ],
  'mailgun': [
    {label: 'API Key', type: 'password', required: true, placeholder: 'Your Mailgun private API key'},
    {label: 'Domain', type: 'text', required: true, placeholder: 'Your Mailgun domain (e.g., mg.example.com)'},
    {label: 'Region', type: 'text', required: false, placeholder: 'Region (US or EU, default: US)'},
  ],
  'sendgrid': [
    {label: 'API Key', type: 'password', required: true, placeholder: 'Your SendGrid API key'},
    {label: 'From Email', type: 'email', required: true, placeholder: 'Verified sender email address'},
    {label: 'From Name', type: 'text', required: false, placeholder: 'Sender name (optional)'},
  ],
  'zeptomail': [
    {label: 'API Key', type: 'password', required: true, placeholder: 'Your ZeptoMail API key'},
    {label: 'From Email', type: 'email', required: true, placeholder: 'Verified sender email address'},
    {label: 'From Name', type: 'text', required: false, placeholder: 'Sender name (optional)'},
    {label: 'Region', type: 'text', required: false, placeholder: 'API region (com or in, default: com)'},
  ],
  'mailchimp': [
    {label: 'API Key', type: 'password', required: true, placeholder: 'Your MailChimp API key'},
    {label: 'Audience ID', type: 'text', required: true, placeholder: 'Your MailChimp audience/list ID'},
    {label: 'Server Prefix', type: 'text', required: true, placeholder: 'Server prefix (e.g., us1, us2)'},
  ],
};

const availableIntegrations: Omit<Integration, "isConnected" | "connectedAt" | "status">[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Import and export videos directly from your Google Drive",
    icon: "🗂️",
    category: "Storage",
    features: ["Import videos", "Export projects", "Auto-sync", "Folder organization"],
  },
  {
    id: "vimeo",
    name: "Vimeo",
    description: "Upload and manage your videos on Vimeo platform",
    icon: "🎬",
    category: "Video Platform",
    features: ["Direct upload", "Video hosting", "Privacy controls", "Analytics"],
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Publish your videos directly to YouTube channel",
    icon: "📹",
    category: "Video Platform",
    features: ["Channel upload", "Metadata sync", "Thumbnail upload", "Schedule publishing"],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Sync your video projects with Dropbox storage",
    icon: "📦",
    category: "Storage",
    features: ["Cloud sync", "Version control", "Team sharing", "Backup"],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications and share updates in your Slack workspace",
    icon: "💬",
    category: "Communication",
    features: ["Progress notifications", "Team updates", "File sharing", "Project alerts"],
  },
  {
    id: "adobe-creative",
    name: "Adobe Creative Cloud",
    description: "Import projects from Adobe Premiere Pro and After Effects",
    icon: "🎨",
    category: "Creative Tools",
    features: ["Project import", "Asset sync", "Version control", "Collaboration"],
  },
  {
    id: "mailgun",
    name: "Mailgun",
    description: "Send transactional emails and notifications",
    icon: "📧",
    category: "Email Services",
    features: ["Transactional emails", "Email analytics", "Delivery tracking", "Template management"],
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Email delivery and marketing automation platform",
    icon: "✉️",
    category: "Email Services",
    features: ["Email delivery", "Marketing campaigns", "Email templates", "Analytics"],
  },
  {
    id: "zeptomail",
    name: "ZeptoMail",
    description: "Reliable transactional email service by Zoho",
    icon: "📬",
    category: "Email Services",
    features: ["Transactional emails", "Email authentication", "Delivery reports", "API integration"],
  },
  {
    id: "mailchimp",
    name: "MailChimp",
    description: "Email marketing and automation platform",
    icon: "🐵",
    category: "Email Services",
    features: ["Email campaigns", "Audience management", "Automation", "Analytics"],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows between your apps and services",
    icon: "⚡",
    category: "Automation",
    features: ["Workflow automation", "App connections", "Trigger actions", "Data sync"],
  },
];

export default function IntegrationsPage() {
  const { data: session } = useSession();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [googleDriveVideos, setGoogleDriveVideos] = useState<any[]>([]);
  const [loadingGoogleDrive, setLoadingGoogleDrive] = useState(false);
  const [importingVideos, setImportingVideos] = useState<string[]>([]);
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string>("");
  const [testingEmail, setTestingEmail] = useState<string | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [currentIntegration, setCurrentIntegration] = useState<string>("");
  const [credentials, setCredentials] = useState<{[key: string]: string}>({});
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [defaultEmailProvider, setDefaultEmailProvider] = useState<string>("");

  const categories = ["all", "Storage", "Video Platform", "Communication", "Creative Tools", "Email Services", "Automation"];

  useEffect(() => {
    if (session) {
      fetchIntegrations();
      fetchUserPreferences();
    }
  }, [session]);

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      if (response.ok) {
        const data = await response.json();
        setDefaultEmailProvider(data.defaultEmailProvider || "");
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  const setAsDefaultEmailProvider = async (integrationId: string) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultEmailProvider: integrationId })
      });

      if (response.ok) {
        setDefaultEmailProvider(integrationId);
        const integration = integrations.find(i => i.id === integrationId);
        toast.success(`${integration?.name} set as default email provider`);
      } else {
        toast.error('Failed to set default email provider');
      }
    } catch (error) {
      toast.error('Error setting default email provider');
    }
  };

  const fetchIntegrations = async () => {
    try {
      // Fetch saved integrations from API
      const response = await fetch('/api/integrations/credentials');
      const savedIntegrations = response.ok ? await response.json() : [];
      
      // Create a map of saved integrations for quick lookup
      const savedIntegrationsMap = new Map(
        savedIntegrations.map((integration: any) => [integration.integrationId, integration])
      );
      
      // Transform available integrations to include connection status
      const transformedIntegrations: Integration[] = availableIntegrations.map(integration => {
        const savedIntegration = savedIntegrationsMap.get(integration.id) as any;
        return {
          ...integration,
          isConnected: savedIntegration?.isConnected || false,
          status: savedIntegration?.status || "inactive" as const,
          connectedAt: savedIntegration?.connectedAt,
        };
      });
      
      setIntegrations(transformedIntegrations);
    } catch (error) {
      toast.error("Error loading integrations");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integrationId: string) => {
    setConnecting(integrationId);
    
    try {
      if (integrationId === 'google-drive') {
        // For Google Drive, show the import modal instead of just connecting
        setShowGoogleDriveModal(true);
        await fetchGoogleDriveVideos();
      } else if (credentialRequirements[integrationId]) {
        // For integrations that require credentials, show credential modal
        setCurrentIntegration(integrationId);
        setCredentials({});
        setShowCredentialModal(true);
      } else {
        // For simple integrations, connect directly
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIntegrations(prev => 
          prev.map(integration => 
            integration.id === integrationId 
              ? { 
                  ...integration, 
                  isConnected: true, 
                  status: "active" as const,
                  connectedAt: new Date().toISOString()
                }
              : integration
          )
        );
        
        const integration = integrations.find(i => i.id === integrationId);
        toast.success(`Successfully connected to ${integration?.name}`);
        await fetchIntegrations();
      }
    } catch (error) {
      toast.error("Failed to connect integration");
    } finally {
      if (!credentialRequirements[integrationId] && integrationId !== 'google-drive') {
        setConnecting(null);
      }
    }
  };

  const fetchGoogleDriveVideos = async () => {
    setLoadingGoogleDrive(true);
    try {
      const response = await fetch('/api/integrations/google-drive/videos');
      if (response.ok) {
        const videos = await response.json();
        setGoogleDriveVideos(videos);
      } else {
        toast.error('Failed to fetch Google Drive videos');
      }
    } catch (error) {
      toast.error('Error connecting to Google Drive');
    } finally {
      setLoadingGoogleDrive(false);
    }
  };

  const handleImportVideo = async (video: any) => {
    setImportingVideos(prev => [...prev, video.id]);
    
    try {
      const response = await fetch('/api/integrations/google-drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: video.id,
          fileName: video.name,
          project: 'Google Drive Import',
          tags: 'imported, google-drive'
        })
      });

      if (response.ok) {
        toast.success(`${video.name} imported successfully`);
        setGoogleDriveVideos(prev => prev.filter(v => v.id !== video.id));
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to import video');
      }
    } catch (error) {
      toast.error('Error importing video');
    } finally {
      setImportingVideos(prev => prev.filter(id => id !== video.id));
    }
  };

  const handleTestEmail = async (testEmail: string) => {
    setTestingEmail(emailProvider);
    
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: emailProvider,
          testEmail
        })
      });

      if (response.ok) {
        toast.success(`Test email sent to ${testEmail}`);
        
        // Mark as connected after successful test
        setIntegrations(prev => 
          prev.map(integration => 
            integration.id === emailProvider 
              ? { 
                  ...integration, 
                  isConnected: true, 
                  status: "active" as const,
                  connectedAt: new Date().toISOString()
                }
              : integration
          )
        );
        
        setShowEmailConfigModal(false);
        setEmailProvider("");
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send test email');
      }
    } catch (error) {
      toast.error('Error testing email service');
    } finally {
      setTestingEmail(null);
    }
  };

  const handleSaveCredentials = async () => {
    setSavingCredentials(true);
    
    try {
      // Validate required fields
      const requirements = credentialRequirements[currentIntegration];
      const requiredFields = requirements.filter(req => req.required);
      const missingFields = requiredFields.filter(field => !credentials[field.label]?.trim());
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }

      const integration = integrations.find(i => i.id === currentIntegration);
      
      // For email services, test the connection before saving
      if (integration?.category === "Email Services") {
        try {
          setTestingEmail(currentIntegration);
          
          // Test email with current user's email
          const testResponse = await fetch('/api/email/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: currentIntegration,
              testEmail: session?.user?.email,
              credentials: credentials
            })
          });

          if (!testResponse.ok) {
            const testError = await testResponse.json();
            toast.error(`Email test failed: ${testError.error || 'Invalid credentials'}`);
            return;
          }
          
          toast.success(`Email test successful! Test email sent to ${session?.user?.email}`);
        } catch (testError) {
          toast.error('Email test failed. Please check your credentials.');
          return;
        } finally {
          setTestingEmail(null);
        }
      }

      // Save credentials (in real app, this would encrypt and store securely)
      const response = await fetch('/api/integrations/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: currentIntegration,
          credentials: credentials
        })
      });

      if (response.ok) {
        // Mark integration as connected
        setIntegrations(prev => 
          prev.map(integration => 
            integration.id === currentIntegration 
              ? { 
                  ...integration, 
                  isConnected: true, 
                  status: "active" as const,
                  connectedAt: new Date().toISOString(),
                  settings: credentials
                }
              : integration
          )
        );
        
        toast.success(`Successfully connected to ${integration?.name}`);
        
        // Close modal and reset
        setShowCredentialModal(false);
        setCurrentIntegration("");
        setCredentials({});
        await fetchIntegrations();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save credentials');
      }
    } catch (error) {
      toast.error('Error saving credentials');
    } finally {
      setSavingCredentials(false);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await fetch('/api/integrations/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect integration');
      }

      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { 
                ...integration, 
                isConnected: false, 
                status: "inactive" as const,
                connectedAt: undefined
              }
            : integration
        )
      );

      const integration = integrations.find(i => i.id === integrationId);
      if (defaultEmailProvider === integrationId) {
        setDefaultEmailProvider("");
      }
      toast.success(`Disconnected from ${integration?.name}`);
      await fetchIntegrations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect integration");
    }
  };

  const filteredIntegrations = selectedCategory === "all" 
    ? integrations 
    : integrations.filter(integration => integration.category === selectedCategory);

  const connectedCount = integrations.filter(i => i.isConnected).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-2">
            Connect your favorite tools and services to streamline your video workflow
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={fetchIntegrations}
            variant="outline"
            className="text-gray-600 border-gray-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{integrations.length}</p>
                <p className="text-sm text-gray-500">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{connectedCount}</p>
                <p className="text-sm text-gray-500">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Upload className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {integrations.filter(i => i.category === "Storage").length}
                </p>
                <p className="text-sm text-gray-500">Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {integrations.filter(i => i.category === "Video Platform").length}
                </p>
                <p className="text-sm text-gray-500">Platforms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            onClick={() => setSelectedCategory(category)}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            className={
              selectedCategory === category
                ? "bg-blue-600 text-white"
                : "text-gray-600 border-gray-200 hover:bg-gray-50"
            }
          >
            {category === "all" ? "All Categories" : category}
          </Button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredIntegrations.map((integration) => (
          <Card
            key={integration.id}
            className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {integration.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {integration.category}
                      </span>
                    </div>
                  </div>
                  {integration.isConnected && (
                    <div className="flex items-center text-green-600">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed">
                  {integration.description}
                </p>

                {/* Features */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {integration.features.slice(0, 3).map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700"
                      >
                        {feature}
                      </span>
                    ))}
                    {integration.features.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-50 text-gray-600">
                        +{integration.features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                {integration.isConnected && integration.connectedAt && (
                  <div className="text-xs text-gray-500">
                    Connected {new Date(integration.connectedAt).toLocaleDateString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col space-y-2 pt-2">
                  {integration.isConnected ? (
                    <>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleDisconnect(integration.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-600 border-gray-200 hover:bg-gray-50"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      {integration.category === "Email Services" && (
                        <div className="flex space-x-2">
                          {defaultEmailProvider === integration.id ? (
                            <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                              <Check className="h-3 w-3 mr-1" />
                              Default Email Provider
                            </div>
                          ) : (
                            <Button
                              onClick={() => setAsDefaultEmailProvider(integration.id)}
                              variant="outline"
                              size="sm"
                              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              Set as Default
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                  <Button
                    onClick={() => handleConnect(integration.id)}
                    disabled={connecting === integration.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                    size="sm"
                  >
                      {connecting === integration.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No integrations found
            </h3>
            <p className="text-gray-500">
              Try selecting a different category or check back later for new integrations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connected Integrations Section */}
      {connectedCount > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Connected Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations
              .filter(i => i.isConnected)
              .map((integration) => (
                <Card key={integration.id} className="border-0 shadow-sm bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{integration.icon}</div>
                        <div>
                          <h4 className="font-medium text-gray-900">{integration.name}</h4>
                          <p className="text-sm text-gray-600">
                            Connected {integration.connectedAt && new Date(integration.connectedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          <span className="text-sm">Active</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Google Drive Import Modal */}
      {showGoogleDriveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🗂️</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Import from Google Drive</h3>
                  <p className="text-sm text-gray-500">Select videos to import to your video library</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowGoogleDriveModal(false);
                  setGoogleDriveVideos([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingGoogleDrive ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading videos from Google Drive...</p>
                  </div>
                </div>
              ) : googleDriveVideos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
                  <p className="text-gray-500">No video files found in your Google Drive.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Found {googleDriveVideos.length} video{googleDriveVideos.length !== 1 ? 's' : ''}
                    </h4>
                    <Button
                      onClick={fetchGoogleDriveVideos}
                      variant="outline"
                      size="sm"
                      disabled={loadingGoogleDrive}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {googleDriveVideos.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            {video.thumbnailLink ? (
                              <img
                                src={video.thumbnailLink}
                                alt={video.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Video className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate" title={video.name}>
                              {video.name}
                            </h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span>{video.mimeType}</span>
                              <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
                              <span>{new Date(video.createdTime).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button
                            onClick={() => window.open(video.webViewLink, '_blank')}
                            variant="outline"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleImportVideo(video)}
                            disabled={importingVideos.includes(video.id)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {importingVideos.includes(video.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Importing...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Import
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowGoogleDriveModal(false);
                  setGoogleDriveVideos([]);
                }}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Configuration Modal */}
      {showEmailConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📧</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Configure {integrations.find(i => i.id === emailProvider)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">Test your email integration</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmailConfigModal(false);
                  setEmailProvider("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Email Address
                  </label>
                  <input
                    type="email"
                    id="testEmail"
                    placeholder="Enter email to test integration"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll send a test email to verify your integration is working
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium">First-time Setup</p>
                      <p className="text-blue-700 mt-1">
                        Please provide your {integrations.find(i => i.id === emailProvider)?.name} API credentials 
                        below to connect your account. Your credentials are stored securely and used only for this integration.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Features enabled:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {integrations.find(i => i.id === emailProvider)?.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowEmailConfigModal(false);
                  setEmailProvider("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const testEmailInput = document.getElementById('testEmail') as HTMLInputElement;
                  const testEmail = testEmailInput?.value;
                  if (testEmail) {
                    handleTestEmail(testEmail);
                  } else {
                    toast.error('Please enter a test email address');
                  }
                }}
                disabled={testingEmail === emailProvider}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {testingEmail === emailProvider ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Testing...
                  </>
                ) : (
                  'Send Test Email'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Credential Configuration Modal */}
      {showCredentialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {integrations.find(i => i.id === currentIntegration)?.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Connect {integrations.find(i => i.id === currentIntegration)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">Enter your credentials to connect</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCredentialModal(false);
                  setCurrentIntegration("");
                  setCredentials({});
                  setConnecting(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {credentialRequirements[currentIntegration]?.map((requirement) => (
                <div key={requirement.label}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {requirement.label}
                    {requirement.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={requirement.type}
                    value={credentials[requirement.label] || ''}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      [requirement.label]: e.target.value
                    }))}
                    placeholder={requirement.placeholder}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-blue-800 font-medium">Secure Storage</p>
                    <p className="text-blue-700 mt-1">
                      Your credentials are encrypted and stored securely. They will only be used to connect with the {integrations.find(i => i.id === currentIntegration)?.name} service.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">This will enable:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {integrations.find(i => i.id === currentIntegration)?.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowCredentialModal(false);
                  setCurrentIntegration("");
                  setCredentials({});
                  setConnecting(null);
                }}
                variant="outline"
                className="flex-1"
                disabled={savingCredentials}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCredentials}
                disabled={savingCredentials}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingCredentials ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  'Save & Connect'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
