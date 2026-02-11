import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  User as UserIcon, 
  Mail, 
  Edit3,
  Save,
  LogOut,
  Check,
  Palette,
} from "lucide-react";
import { api } from "@/lib/api";

const avatarOptions = [
  { id: "avatar1", src: "/assets/avatars/avatar1.png" },
  { id: "avatar2", src: "/assets/avatars/avatar2.png" },
  { id: "avatar3", src: "/assets/avatars/avatar3.png" },
  { id: "avatar4", src: "/assets/avatars/avatar4.png" },
];

function AvatarCard({ id, src, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id, src)}
      className={`relative flex items-center justify-center rounded-xl border bg-background p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        selected ? "border-emerald-500 ring-1 ring-emerald-400/50" : "border-border hover:border-primary/40"
      }`}
      aria-pressed={selected}
    >
      <img src={src} alt={`Avatar ${id}`} className="h-16 w-16 rounded-full" />
      {selected && (
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const { changeTheme } = useTheme();
  
  const [editedProfile, setEditedProfile] = useState({
    name: "",
    email: "",
    avatar_url: "",
    theme: "light",
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setEditedProfile({
        name: data.name || "",
        email: data.email || "",
        avatar_url: data.avatar_url || "",
        theme: data.theme || "light",
      });
      setAvatarPreview(data.avatar_url || "");
      // Apply theme when loading profile
      if (data.theme) {
        changeTheme(data.theme);
      }
      // Store username in localStorage for dashboard greeting
      if (data.name) {
        localStorage.setItem("wealthwise_username", data.name);
      }
      const matched = avatarOptions.find((option) => option.src === data.avatar_url);
      setSelectedAvatarId(matched?.id || "");
    } catch (error) {
      console.error("Failed to load profile:", error);
      // Set default values even on error so page still shows
      setProfile({
        user_id: "user",
        name: "User",
        email: "",
        avatar_url: "",
      });
      setEditedProfile({
        name: "User",
        email: "",
        avatar_url: "",
      });
      setAvatarPreview("");
      setSelectedAvatarId("");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile(editedProfile);
      setProfile({ ...profile, ...editedProfile });
      setIsEditing(false);
      // Apply theme immediately when saved
      if (editedProfile.theme) {
        changeTheme(editedProfile.theme);
      }
      // Update localStorage with new name for dashboard greeting
      if (editedProfile.name) {
        localStorage.setItem("wealthwise_username", editedProfile.name);
      }
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("wealthwise_session");
      localStorage.removeItem("wealthwise_user");
      localStorage.removeItem("wealthwise_username");
      localStorage.removeItem("wealthwise_theme");
    } catch (e) {
      // ignore localStorage errors
    }
    navigate("/auth");
  };

  const handleAvatarSelect = (id, src) => {
    setSelectedAvatarId(id);
    setEditedProfile((prev) => ({ ...prev, avatar_url: src }));
    setAvatarPreview(src);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account information</p>
        </div>
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>

      {/* Profile Card */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="bg-card border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Personal Information</CardTitle>
            {isEditing ? (
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditedProfile({
                    name: profile?.name || "",
                    email: profile?.email || "",
                    avatar_url: profile?.avatar_url || "",
                  });
                  setAvatarPreview(profile?.avatar_url || "");
                  const matched = avatarOptions.find((option) => option.src === profile?.avatar_url);
                  setSelectedAvatarId(matched?.id || "");
                }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  key={avatarPreview || editedProfile.avatar_url || "avatar"}
                  src={avatarPreview || editedProfile.avatar_url}
                  alt="Profile avatar"
                />
                <AvatarFallback className="text-2xl">
                  {getInitials(editedProfile.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground">{editedProfile.name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{editedProfile.email || "No email"}</p>
              {profile?.created_at && (
                <Badge variant="outline" className="mt-2">
                  Member since {new Date(profile.created_at).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Choose avatar</h4>
                  <p className="text-xs text-muted-foreground">Select one of the official avatars.</p>
                </div>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Avatar"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {avatarOptions.map((option) => (
                  <AvatarCard
                    key={option.id}
                    id={option.id}
                    src={option.src}
                    selected={selectedAvatarId === option.id}
                    onSelect={handleAvatarSelect}
                  />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Profile Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                <UserIcon className="w-4 h-4 inline mr-2" />
                Name
              </Label>
              <Input
                id="name"
                value={editedProfile.name}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, name: e.target.value })
                }
                disabled={!isEditing}
                className="bg-input text-foreground border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editedProfile.email}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, email: e.target.value })
                }
                disabled={!isEditing}
                className="bg-input text-foreground border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme" className="text-foreground">
                <Palette className="w-4 h-4 inline mr-2" />
                Theme
              </Label>
              <select
                id="theme"
                value={editedProfile.theme || "light"}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, theme: e.target.value })
                }
                disabled={!isEditing}
                className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
