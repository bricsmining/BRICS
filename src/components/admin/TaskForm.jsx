import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Save } from 'lucide-react';

const TaskForm = ({
  taskData,
  onChange,
  onActiveChange,
  onVerificationTypeChange,
  onSubmit,
  onCancel,
  isEditing,
  tokenName = 'STON'
}) => {
  const idPrefix = isEditing ? 'edit' : 'new';
  const showVerificationOptions = taskData?.type === 'telegram_join';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange(e);

    if (name === 'type' && value !== 'telegram_join' && onVerificationTypeChange) {
      onVerificationTypeChange('manual');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${idPrefix}-title`} className="text-white">Title</Label>
          <Input
            id={`${idPrefix}-title`}
            name="title"
            value={taskData.title}
            onChange={handleInputChange}
            required
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-reward`} className="text-white">Reward ({tokenName})</Label>
          <Input
            id={`${idPrefix}-reward`}
            name="reward"
            type="number"
            min="0"
            step="1"
            value={taskData.reward}
            onChange={handleInputChange}
            required
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-description`} className="text-white">Description</Label>
        <Input
          id={`${idPrefix}-description`}
          name="description"
          value={taskData.description || ''}
          onChange={handleInputChange}
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${idPrefix}-type`} className="text-white">Type</Label>
          <select
            id={`${idPrefix}-type`}
            name="type"
            value={taskData.type}
            onChange={handleInputChange}
            className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="telegram_join">Telegram Join</option>
            <option value="twitter_follow">Twitter Follow</option>
            <option value="visit_site">Visit Site</option>
            <option value="daily_checkin">Daily Check-in</option>
            <option value="referral">Referral (System)</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-target`} className="text-white">Target (URL/@handle)</Label>
          <Input
            id={`${idPrefix}-target`}
            name="target"
            value={taskData.target || ''}
            onChange={handleInputChange}
            placeholder={
              taskData.type === 'telegram_join' || taskData.type === 'twitter_follow'
                ? '@username'
                : 'https://...'
            }
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      {showVerificationOptions && onVerificationTypeChange && (
        <div className="pt-2">
          <Label className="text-white">Verification Method</Label>
          <RadioGroup
            name="verificationType"
            value={taskData.verificationType || 'manual'}
            onValueChange={onVerificationTypeChange}
            className="flex items-center space-x-4 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id={`${idPrefix}-verify-auto`} />
              <Label htmlFor={`${idPrefix}-verify-auto`} className="text-white">Automatic</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id={`${idPrefix}-verify-manual`} />
              <Label htmlFor={`${idPrefix}-verify-manual`} className="text-white">Manual</Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-1">
            Automatic requires backend integration. Manual requires admin review.
          </p>
        </div>
      )}

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id={`${idPrefix}-active`}
          checked={taskData.active}
          onCheckedChange={onActiveChange}
        />
        <Label htmlFor={`${idPrefix}-active`} className="text-white">Task Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit"
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {isEditing ? (
            <><Save className="mr-2 h-4 w-4" /> Save Changes</>
          ) : (
            <><PlusCircle className="mr-2 h-4 w-4" /> Add Task</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
