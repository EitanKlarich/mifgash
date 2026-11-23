import React, { useState } from 'react';
import { X, Vote, Trash2 } from 'lucide-react';
import { Group, Poll } from '../types';

interface CreatePollModalProps {
  groups: Group[];
  prefilledGroupId?: string;
  onClose: () => void;
  onCreatePoll: (pollData: Partial<Poll>) => void;
  isPhoneFrame?: boolean;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  groups,
  prefilledGroupId,
  onClose,
  onCreatePoll,
  isPhoneFrame = false,
}) => {
  const [groupId, setGroupId] = useState(prefilledGroupId || groups[0]?.id || '');
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<'Restaurant' | 'Date' | 'Time' | 'Activity' | 'General'>('Restaurant');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [newOptInput, setNewOptInput] = useState('');

  const handleAddOption = () => {
    const trimmed = newOptInput.trim();
    if (trimmed && !options.includes(trimmed) && options.length < 10) {
      setOptions([...options, trimmed]);
      setNewOptInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const validOptions = options.map((o) => o.trim()).filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !question.trim() || validOptions.length < 2) return;

    const group = groups.find((g) => g.id === groupId);

    onCreatePoll({
      groupId,
      groupName: group?.name || 'Group',
      question: question.trim(),
      category,
      options: validOptions.map((opt, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text: opt,
        votes: [],
      })),
    });
  };

  return (
    <div
      className={`${
        isPhoneFrame ? 'absolute p-2 sm:p-4' : 'fixed safe-modal-container sm:p-4'
      } inset-0 bg-[#0A0E17]/80 backdrop-blur-xs z-50 flex items-center justify-center overflow-hidden`}
    >
      <div
        className={`bg-[#121724] text-[#F1F3F7] rounded-2xl max-w-md w-full border border-[#1F283C] shadow-2xl flex flex-col overflow-hidden min-h-0 ${
          isPhoneFrame ? 'max-h-[96%]' : 'max-h-[90vh]'
        }`}
      >
        <div className="p-4 border-b border-[#1F283C] flex items-center justify-between bg-[#121724]">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-[#182033] text-[#8E84E4] border border-[#1F283C] rounded-lg flex items-center justify-center">
              <Vote className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-semibold text-[#F1F3F7] text-sm">Create Decision Poll</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#5E6980] hover:text-[#F1F2F6] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
              Group *
            </label>
            {groups.length === 0 ? (
              <div className="px-3 py-2 rounded-xl bg-[#182033] border border-[#1F283C] text-xs text-[#8D98AF]">
                Join or create a group first to post a poll.
              </div>
            ) : (
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] focus:outline-none focus:border-[#8E84E4]"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#121724] text-[#F1F3F7]">
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
              Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(['Restaurant', 'Date', 'Time', 'Activity', 'General'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors truncate ${
                    category === cat
                      ? 'bg-[#182033] text-[#F1F3F7] border-[#8E84E4]/60'
                      : 'bg-[#182033] text-[#8D98AF] border-[#1F283C] hover:text-[#F1F3F7]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
              Question *
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Where should we eat on Friday?"
              className="w-full bg-[#182033] border border-[#1F283C] px-3 py-2 rounded-xl text-xs font-medium text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#8D98AF] uppercase tracking-wider text-[11px] mb-1">
              Choices
            </label>
            <div className="space-y-1.5 mb-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={opt}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => {
                      const copy = [...options];
                      copy[i] = e.target.value;
                      setOptions(copy);
                    }}
                    className="flex-1 bg-[#182033] border border-[#1F283C] px-3 py-1.5 rounded-lg text-xs text-[#F1F2F6] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="p-1.5 text-[#5E6980] hover:text-[#D45D6D] rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={newOptInput}
                onChange={(e) => setNewOptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder="+ Add another option"
                className="flex-1 bg-[#182033] border border-[#1F283C] px-3 py-1.5 rounded-lg text-xs text-[#F1F3F7] placeholder-[#5E6980] focus:outline-none focus:border-[#8E84E4]"
              />
              <button
                type="button"
                onClick={handleAddOption}
                className="px-3 py-1.5 bg-[#182033] text-[#8D98AF] hover:text-[#F1F3F7] border border-[#1F283C] rounded-lg text-xs font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#1F283C]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#121724] text-[#8D98AF] hover:text-[#F1F3F7] font-medium text-xs rounded-lg border border-[#1F283C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupId || !question.trim() || validOptions.length < 2}
              className="px-4 py-1.5 bg-[#8E84E4] hover:bg-[#7B71D3] disabled:opacity-45 disabled:cursor-not-allowed text-[#F1F3F7] font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Post Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
