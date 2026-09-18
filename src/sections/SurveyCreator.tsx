import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Settings,
  BarChart3,
  Share2,
  Eye,
  CheckCircle2,
  Type,
  List,
  Star,
  CheckSquare,
  ChevronDown,
  Copy,
  ExternalLink,
  Users,
  MessageSquare
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CustomSurvey, SurveyQuestion } from '@/types';

gsap.registerPlugin(ScrollTrigger);

const questionTypes = [
  { id: 'text', label: 'Text Answer', icon: Type },
  { id: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { id: 'rating', label: 'Rating Scale', icon: Star },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { id: 'dropdown', label: 'Dropdown', icon: ChevronDown },
];

function QuestionCard({ 
  question, 
  index, 
  onUpdate, 
  onDelete,
  isPreview = false
}: { 
  question: SurveyQuestion; 
  index: number;
  onUpdate?: (updates: Partial<SurveyQuestion>) => void;
  onDelete?: () => void;
  isPreview?: boolean;
}) {
  const typeConfig = questionTypes.find(t => t.id === question.type);
  const TypeIcon = typeConfig?.icon || Type;

  return (
    <Card className={`p-5 ${isPreview ? 'bg-white/5' : 'bg-white/5 hover:bg-white/10'} border-white/10 transition-all duration-300`}>
      <div className="flex items-start gap-4">
        {!isPreview && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center">
              <span className="text-sm font-bold text-brand-purple">{index + 1}</span>
            </div>
            <GripVertical className="w-4 h-4 text-white/20 cursor-move" />
          </div>
        )}
        
        <div className="flex-1">
          {/* Question Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              {onUpdate ? (
                <Input
                  value={question.question}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                  placeholder="Enter your question"
                  className="bg-transparent border-0 border-b border-white/20 rounded-none text-white text-lg font-medium placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-brand-purple px-0"
                />
              ) : (
                <p className="text-lg font-medium text-white">{question.question}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20">
                <TypeIcon className="w-3 h-3 mr-1" />
                {typeConfig?.label}
              </Badge>
              {question.required && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  Required
                </Badge>
              )}
              {!isPreview && onDelete && (
                <button 
                  onClick={onDelete}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          </div>

          {/* Question Options */}
          {(question.type === 'multiple_choice' || question.type === 'checkbox' || question.type === 'dropdown') && (
            <div className="space-y-2">
              {question.options?.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-3">
                  {question.type === 'checkbox' ? (
                    <div className="w-4 h-4 rounded border border-white/30" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/30" />
                  )}
                  {onUpdate ? (
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(question.options || [])];
                        newOptions[optIndex] = e.target.value;
                        onUpdate({ options: newOptions });
                      }}
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-1 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
                    />
                  ) : (
                    <span className="text-white/80">{option}</span>
                  )}
                  {onUpdate && (
                    <button
                      onClick={() => {
                        const newOptions = question.options?.filter((_, i) => i !== optIndex);
                        onUpdate({ options: newOptions });
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-white/40" />
                    </button>
                  )}
                </div>
              ))}
              {onUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUpdate({ options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] })}
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* Rating Scale */}
          {question.type === 'rating' && (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className="w-6 h-6 text-white/20" 
                />
              ))}
              <span className="text-sm text-white/40 ml-2">1 to 5 stars</span>
            </div>
          )}

          {/* Text Answer Preview */}
          {question.type === 'text' && (
            <div className="h-20 bg-white/5 rounded-lg border border-white/10" />
          )}

          {/* Question Settings */}
          {!isPreview && onUpdate && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
              <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="rounded border-white/30 bg-white/5"
                />
                Required
              </label>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function SurveyCard({ survey, onEdit, onDelete }: { 
  survey: CustomSurvey; 
  onEdit: (survey: CustomSurvey) => void;
  onDelete: (id: string) => void;
}) {
  const responseCount = survey.responses?.length || 0;
  const statusColors = {
    draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <Card className="glass-card p-5 hover:border-brand-purple/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <Badge variant="outline" className={statusColors[survey.status]}>
          {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
        </Badge>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(survey)}
            className="p-1.5 hover:bg-white/10 rounded-lg"
          >
            <Settings className="w-4 h-4 text-white/40" />
          </button>
          <button 
            onClick={() => onDelete(survey.id)}
            className="p-1.5 hover:bg-red-500/10 rounded-lg"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-heading font-semibold text-white mb-2">{survey.title}</h3>
      <p className="text-sm text-white/50 mb-4 line-clamp-2">{survey.description}</p>

      <div className="flex items-center gap-4 text-sm text-white/40">
        <div className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          {survey.questions.length} questions
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {responseCount} responses
        </div>
      </div>
    </Card>
  );
}

export function SurveyCreator() {
  const { customSurveys, addCustomSurvey, updateCustomSurvey, removeCustomSurvey } = useAppStore();
  const sectionRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'builder' | 'preview'>('list');
  const [editingSurvey, setEditingSurvey] = useState<CustomSurvey | null>(null);
  const [previewSurvey, setPreviewSurvey] = useState<CustomSurvey | null>(null);
  const [surveyData, setSurveyData] = useState<Partial<CustomSurvey>>({
    title: '',
    description: '',
    questions: [],
    status: 'draft',
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

  const handleCreateNew = () => {
    setEditingSurvey(null);
    setSurveyData({
      title: 'New Survey',
      description: '',
      questions: [],
      status: 'draft',
    });
    setActiveTab('builder');
  };

  const handleEdit = (survey: CustomSurvey) => {
    setEditingSurvey(survey);
    setSurveyData(survey);
    setActiveTab('builder');
  };

  const handleAddQuestion = (type: string) => {
    const newQuestion: SurveyQuestion = {
      id: Date.now().toString(),
      type: type as SurveyQuestion['type'],
      question: '',
      required: false,
      options: type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
      minRating: 1,
      maxRating: 5,
    };
    setSurveyData({
      ...surveyData,
      questions: [...(surveyData.questions || []), newQuestion],
    });
  };

  const handleUpdateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    const newQuestions = [...(surveyData.questions || [])];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setSurveyData({ ...surveyData, questions: newQuestions });
  };

  const handleDeleteQuestion = (index: number) => {
    const newQuestions = surveyData.questions?.filter((_, i) => i !== index);
    setSurveyData({ ...surveyData, questions: newQuestions });
  };

  const handleSave = () => {
    if (editingSurvey) {
      updateCustomSurvey(editingSurvey.id, surveyData);
    } else {
      const newSurvey: CustomSurvey = {
        id: Date.now().toString(),
        title: surveyData.title || 'Untitled Survey',
        description: surveyData.description || '',
        createdBy: 'user1',
        questions: surveyData.questions || [],
        responses: [],
        status: 'draft',
        createdAt: new Date(),
      };
      addCustomSurvey(newSurvey);
    }
    setActiveTab('list');
  };

  const handleDelete = (id: string) => {
    removeCustomSurvey(id);
  };

  const handlePreview = (survey: CustomSurvey) => {
    setPreviewSurvey(survey);
    setActiveTab('preview');
  };

  return (
    <section 
      id="survey-creator" 
      ref={sectionRef}
      className="relative py-20 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-dark via-brand-teal/5 to-brand-dark" />

      <div className="relative z-10 section-container">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="animate-item">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-white mb-3">
              Survey <span className="gradient-text">Creator</span>
            </h2>
            <p className="text-white/60 max-w-xl">
              Build custom surveys to gather feedback, conduct research, or collect data. 
              Share with your audience and analyze responses.
            </p>
          </div>

          {activeTab === 'list' && (
            <Button 
              onClick={handleCreateNew}
              className="btn-primary animate-item"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Survey
            </Button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'list' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-item">
            {customSurveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            
            {/* Create New Card */}
            <Card 
              onClick={handleCreateNew}
              className="glass-card p-5 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:border-brand-purple/30 hover:bg-brand-purple/5 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-brand-purple/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-brand-purple" />
              </div>
              <p className="text-white font-medium">Create New Survey</p>
              <p className="text-sm text-white/50 mt-1">Start from scratch</p>
            </Card>
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="animate-item">
            {/* Builder Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('list')}
                  className="text-white/60 hover:text-white"
                >
                  ← Back
                </Button>
                <Input
                  value={surveyData.title}
                  onChange={(e) => setSurveyData({ ...surveyData, title: e.target.value })}
                  className="bg-transparent border-0 text-xl font-heading font-semibold text-white placeholder:text-white/30 focus-visible:ring-0 w-64"
                  placeholder="Survey Title"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handlePreview(surveyData as CustomSurvey)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-gradient-to-r from-brand-purple to-brand-blue text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Survey
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Question Types Sidebar */}
              <div className="lg:col-span-1">
                <Card className="glass-card p-4 sticky top-24">
                  <h4 className="font-medium text-white mb-4">Question Types</h4>
                  <div className="space-y-2">
                    {questionTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleAddQuestion(type.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left"
                        >
                          <Icon className="w-5 h-5 text-brand-purple" />
                          <span className="text-sm text-white">{type.label}</span>
                          <Plus className="w-4 h-4 text-white/40 ml-auto" />
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Questions Area */}
              <div className="lg:col-span-3 space-y-4">
                <Textarea
                  value={surveyData.description}
                  onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
                  placeholder="Survey description (optional)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  rows={2}
                />

                {surveyData.questions?.length === 0 ? (
                  <Card className="glass-card p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-white/60">Add your first question to get started</p>
                  </Card>
                ) : (
                  surveyData.questions?.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      onUpdate={(updates) => handleUpdateQuestion(index, updates)}
                      onDelete={() => handleDeleteQuestion(index)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && previewSurvey && (
          <div className="max-w-2xl mx-auto animate-item">
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('builder')}
                className="text-white/60 hover:text-white"
              >
                ← Back to Editor
              </Button>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button 
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            <Card className="glass-card p-8">
              <h2 className="text-2xl font-heading font-bold text-white mb-2">
                {previewSurvey.title}
              </h2>
              {previewSurvey.description && (
                <p className="text-white/60 mb-8">{previewSurvey.description}</p>
              )}

              <div className="space-y-6">
                {previewSurvey.questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    isPreview
                  />
                ))}
              </div>

              <Button className="w-full mt-8 bg-gradient-to-r from-brand-purple to-brand-blue text-white">
                Submit Survey
              </Button>
            </Card>
          </div>
        )}

        {/* Features */}
        {activeTab === 'list' && (
          <div className="grid sm:grid-cols-4 gap-4 mt-12 animate-item">
            <div className="text-center p-5">
              <BarChart3 className="w-8 h-8 text-brand-purple mx-auto mb-3" />
              <h4 className="font-medium text-white mb-1">Analytics</h4>
              <p className="text-sm text-white/50">Track responses in real-time</p>
            </div>
            <div className="text-center p-5">
              <Share2 className="w-8 h-8 text-brand-teal mx-auto mb-3" />
              <h4 className="font-medium text-white mb-1">Easy Sharing</h4>
              <p className="text-sm text-white/50">Share via link or embed</p>
            </div>
            <div className="text-center p-5">
              <Eye className="w-8 h-8 text-brand-blue mx-auto mb-3" />
              <h4 className="font-medium text-white mb-1">Live Preview</h4>
              <p className="text-sm text-white/50">See how it looks before publishing</p>
            </div>
            <div className="text-center p-5">
              <ExternalLink className="w-8 h-8 text-brand-orange mx-auto mb-3" />
              <h4 className="font-medium text-white mb-1">Export Data</h4>
              <p className="text-sm text-white/50">Download responses as CSV</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
