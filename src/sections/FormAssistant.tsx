import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  Users,
  Heart,
  Zap,
  CheckCircle2,
  Copy,
  Edit2,
  Plus,
  Trash2,
  Shield,
  Lock
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface FieldConfig {
  key: keyof UserProfile;
  label: string;
  icon: React.ElementType;
  color: string;
}

const profileFields: FieldConfig[] = [
  { key: 'name', label: 'Full Name', icon: User, color: '#7F56D9' },
  { key: 'email', label: 'Email Address', icon: Mail, color: '#14B8A6' },
  { key: 'phone', label: 'Phone Number', icon: User, color: '#3B82F6' },
  { key: 'dateOfBirth', label: 'Date of Birth', icon: Calendar, color: '#F97316' },
  { key: 'gender', label: 'Gender', icon: User, color: '#EC4899' },
  { key: 'location', label: 'Location', icon: MapPin, color: '#8B5CF6' },
  { key: 'demographics', label: 'Demographics', icon: GraduationCap, color: '#10B981' },
  { key: 'interests', label: 'Interests', icon: Heart, color: '#EF4444' },
];

function ProfileField({ 
  field, 
  value, 
  onCopy 
}: { 
  field: FieldConfig; 
  value: string;
  onCopy: (value: string) => void;
}) {
  const Icon = field.icon;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 group cursor-pointer"
      onClick={handleCopy}
    >
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${field.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: field.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40">{field.label}</p>
        <p className="text-sm text-white truncate">{value || 'Not set'}</p>
      </div>
      <button 
        className={`p-2 rounded-lg transition-all duration-300 ${
          copied ? 'bg-green-500/20 text-green-400' : 'opacity-0 group-hover:opacity-100 hover:bg-white/10'
        }`}
      >
        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4 text-white/40" />}
      </button>
    </div>
  );
}

export function FormAssistant() {
  const { profiles, activeProfile, setActiveProfile, addProfile, updateProfile, removeProfile } = useAppStore();
  const sectionRef = useRef<HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [autoFillActive, setAutoFillActive] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    phone: '',
    gender: '',
    interests: [],
    platforms: [],
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const triggers: ScrollTrigger[] = [];

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          section.querySelectorAll('.animate-item'),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
        );
      },
      once: true,
    });
    triggers.push(trigger);

    return () => {
      triggers.forEach(t => t.kill());
    };
  }, []);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const handleAutoFill = () => {
    setAutoFillActive(true);
    setTimeout(() => setAutoFillActive(false), 3000);
  };

  const handleEdit = (profile: UserProfile) => {
    setEditingProfile(profile);
    setFormData(profile);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      gender: '',
      interests: [],
      platforms: [],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingProfile) {
      updateProfile(editingProfile.id, formData);
    } else {
      const newProfile: UserProfile = {
        id: Date.now().toString(),
        name: formData.name || 'New Profile',
        email: formData.email || '',
        phone: formData.phone,
        gender: formData.gender,
        interests: formData.interests || [],
        platforms: formData.platforms || [],
      };
      addProfile(newProfile);
      if (!activeProfile) {
        setActiveProfile(newProfile);
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = (profileId: string) => {
    removeProfile(profileId);
    if (activeProfile?.id === profileId) {
      setActiveProfile(profiles.find(p => p.id !== profileId) || null);
    }
  };

  const getFieldValue = (field: FieldConfig): string => {
    if (!activeProfile) return '';
    const value = activeProfile[field.key];
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value || '');
  };

  return (
    <section 
      id="form-assistant" 
      ref={sectionRef}
      className="relative py-20 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-dark via-brand-purple/5 to-brand-dark" />

      <div className="relative z-10 section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold text-white mb-3 animate-item">
            Form <span className="gradient-text">Assistant</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto animate-item">
            Store your profile information securely and fill out survey forms with a single click. 
            Save time and reduce repetitive data entry.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Selector */}
          <div className="animate-item">
            <Card className="glass-card p-5 h-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-semibold text-white">Your Profiles</h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleAdd}
                  className="text-brand-purple hover:text-brand-purple hover:bg-brand-purple/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    onClick={() => setActiveProfile(profile)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 group ${
                      activeProfile?.id === profile.id
                        ? 'bg-gradient-to-r from-brand-purple/20 to-brand-teal/20 border border-brand-purple/30'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activeProfile?.id === profile.id
                            ? 'bg-brand-purple'
                            : 'bg-white/10'
                        }`}>
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{profile.name}</p>
                          <p className="text-xs text-white/50">{profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {activeProfile?.id === profile.id && (
                          <CheckCircle2 className="w-5 h-5 text-brand-teal" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(profile);
                          }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all"
                        >
                          <Edit2 className="w-4 h-4 text-white/40" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(profile.id);
                          }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Security Note */}
              <div className="mt-5 p-4 bg-white/5 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-brand-teal mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Local Storage Only</p>
                    <p className="text-xs text-white/50 mt-1">
                      Your data is stored locally on your device and never sent to any server.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 animate-item">
            <Card className="glass-card p-6 h-full">
              {activeProfile ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-heading font-semibold text-white">
                        {activeProfile.name}
                      </h3>
                      <p className="text-sm text-white/50">Click any field to copy to clipboard</p>
                    </div>
                    <Button
                      onClick={handleAutoFill}
                      disabled={autoFillActive}
                      className={`transition-all duration-500 ${
                        autoFillActive
                          ? 'bg-green-500 hover:bg-green-500'
                          : 'bg-gradient-to-r from-brand-purple to-brand-blue'
                      } text-white`}
                    >
                      {autoFillActive ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied All!
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Quick Copy All
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Fields Grid */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {profileFields.map((field) => (
                      <ProfileField
                        key={field.key}
                        field={field}
                        value={getFieldValue(field)}
                        onCopy={handleCopy}
                      />
                    ))}
                  </div>

                  {/* Interests & Platforms */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-white/60 mb-3">Interests</p>
                        <div className="flex flex-wrap gap-2">
                          {activeProfile.interests?.map((interest) => (
                            <Badge
                              key={interest}
                              variant="secondary"
                              className="bg-brand-purple/20 text-brand-purple border-brand-purple/30"
                            >
                              <Heart className="w-3 h-3 mr-1" />
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-white/60 mb-3">Connected Platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {activeProfile.platforms?.map((platform) => (
                            <Badge
                              key={platform}
                              variant="secondary"
                              className="bg-brand-teal/20 text-brand-teal border-brand-teal/30"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/60 text-center">
                    No profile selected. Create or select a profile to get started.
                  </p>
                  <Button onClick={handleAdd} className="mt-4 btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Profile
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-4 mt-8 animate-item">
          <div className="glass-card p-5">
            <Lock className="w-8 h-8 text-brand-purple mb-3" />
            <h4 className="font-medium text-white mb-1">Secure Storage</h4>
            <p className="text-sm text-white/50">
              All data stays on your device. No cloud storage, no data breaches.
            </p>
          </div>
          <div className="glass-card p-5">
            <Zap className="w-8 h-8 text-brand-teal mb-3" />
            <h4 className="font-medium text-white mb-1">One-Click Fill</h4>
            <p className="text-sm text-white/50">
              Copy any field instantly. Save hours of repetitive typing.
            </p>
          </div>
          <div className="glass-card p-5">
            <Users className="w-8 h-8 text-brand-blue mb-3" />
            <h4 className="font-medium text-white mb-1">Multiple Profiles</h4>
            <p className="text-sm text-white/50">
              Create different profiles for different purposes or family members.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-brand-surface border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading">
              {editingProfile ? 'Edit Profile' : 'Create New Profile'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Fill in your details to quickly autofill survey forms.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Full Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Interests (comma separated)</label>
              <Input
                value={formData.interests?.join(', ')}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value.split(',').map(i => i.trim()) })}
                placeholder="Technology, Gaming, Fitness, Travel"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Connected Platforms</label>
              <Input
                value={formData.platforms?.join(', ')}
                onChange={(e) => setFormData({ ...formData, platforms: e.target.value.split(',').map(p => p.trim()) })}
                placeholder="Swagbucks, Survey Junkie, Prolific"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-brand-purple to-brand-blue text-white"
              >
                {editingProfile ? 'Save Changes' : 'Create Profile'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
