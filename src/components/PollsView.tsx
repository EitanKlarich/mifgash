import React, { useState } from 'react';
import { Plus, ArrowRight, Check, Calendar, Vote } from 'lucide-react';
import { Poll, Group, User } from '../types';

interface PollsViewProps {
  polls: Poll[];
  groups: Group[];
  currentUser: User;
  onVotePoll: (pollId: string, optionId: string) => void;
  onOpenCreatePoll: () => void;
  onConvertPollToEvent: (poll: Poll) => void;
  isPhoneFrame?: boolean;
}

export const PollsView: React.FC<PollsViewProps> = ({
  polls,
  currentUser,
  onVotePoll,
  onOpenCreatePoll,
  onConvertPollToEvent,
  isPhoneFrame = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Date', 'Time', 'Restaurant', 'Activity', 'General'];

  const filteredPolls = polls.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className={`space-y-4 mt-1 ${isPhoneFrame ? 'pb-20' : 'pb-24'} text-[#F1F3F7]`}>
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8D98AF]">
            Group Polls ({filteredPolls.length})
          </h2>
        </div>

        <button
          onClick={onOpenCreatePoll}
          className="bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] font-medium py-1.5 px-3 rounded-xl flex items-center space-x-1.5 transition-colors text-xs shrink-0 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" />
          <span>New Poll</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#182033] text-[#F1F3F7]'
                : 'bg-[#121724] text-[#8D98AF] border border-[#1F283C] hover:text-[#F1F3F7]'
            }`}
          >
            {cat === 'all' ? 'All Polls' : cat}
          </button>
        ))}
      </div>

      {/* Polls Grid */}
      <div className={`grid grid-cols-1 ${isPhoneFrame ? 'gap-3' : 'md:grid-cols-2 gap-4'}`}>
        {filteredPolls.length === 0 ? (
          <div className="col-span-full bg-[#121724] p-10 rounded-2xl border border-[#1F283C] text-center">
            <Vote className="w-8 h-8 text-[#8E84E4] mx-auto mb-2 opacity-60" />
            <p className="text-[#F1F3F7] text-sm font-semibold">No polls found.</p>
            <p className="text-xs text-[#8D98AF] mt-1">Create a poll to vote on dates, places, or activities.</p>
            <button
              type="button"
              onClick={onOpenCreatePoll}
              className="mt-3 px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-[#F1F3F7] text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create a Poll</span>
            </button>
          </div>
        ) : (
          filteredPolls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
            const userHasVoted = poll.options.some((opt) => opt.votes.includes(currentUser.id));

            // Find top voted option
            const sortedOptions = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
            const topOption = sortedOptions[0]?.votes.length > 0 ? sortedOptions[0] : null;

            return (
              <div
                key={poll.id}
                className="bg-[#121724] rounded-2xl border border-[#1F283C] p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div>
                  {/* Group & Timestamp */}
                  <div className="flex items-center justify-between text-xs text-[#8D98AF] mb-1.5">
                    <span className="font-medium text-[#8E84E4]">{poll.groupName}</span>
                    <span>{poll.createdAt}</span>
                  </div>

                  {/* Question */}
                  <h3 className="font-semibold text-[#F1F3F7] text-base leading-snug mb-3">
                    {poll.question}
                  </h3>

                  {/* Available Options with visual vote bars */}
                  <div className="space-y-2">
                    {poll.options.map((opt) => {
                      const isMyVote = opt.votes.includes(currentUser.id);
                      const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                      const isLeading = topOption && topOption.id === opt.id && totalVotes > 0;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onVotePoll(poll.id, opt.id)}
                          className={`w-full relative h-10 rounded-xl overflow-hidden text-left border transition-all cursor-pointer ${
                            isMyVote
                              ? 'border-[#8E84E4] bg-[#182033]'
                              : isLeading
                              ? 'border-[#1F283C] bg-[#182033]/60 hover:border-[#8E84E4]/40'
                              : 'border-[#1F283C] bg-[#0A0E17] hover:border-[#8E84E4]/30'
                          }`}
                        >
                          {/* Vote progress fill bar */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-300 ${
                              isMyVote
                                ? 'bg-[#8E84E4]/25'
                                : 'bg-[#8E84E4]/12'
                            }`}
                            style={{ width: `${pct}%` }}
                          />

                          {/* Content Overlay */}
                          <div className="absolute inset-0 px-3 flex justify-between items-center text-xs z-10">
                            <span className="flex items-center space-x-2 font-medium text-[#F1F3F7] truncate pr-2">
                              {isMyVote && (
                                <span className="w-4 h-4 rounded-full bg-[#8E84E4] text-[#F1F3F7] flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                </span>
                              )}
                              <span className="truncate">{opt.text}</span>
                            </span>

                            <span className="text-xs font-semibold text-[#CBD2E1] shrink-0">
                              {opt.votes.length} {opt.votes.length === 1 ? 'vote' : 'votes'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Voted Indicator */}
                  <div className="mt-2 text-right">
                    <span className="text-[11px] text-[#8D98AF]">
                      {userHasVoted ? '✓ You have voted (tap to change)' : 'Tap an option to vote'}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-[#1F283C] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#5E6980]">
                    {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                  </span>

                  <button
                    onClick={() => onConvertPollToEvent(poll)}
                    className="px-3 py-1.5 bg-[#182033] hover:bg-[#1E1B38] text-[#8E84E4] hover:text-[#A49BE8] border border-[#1F283C] hover:border-[#8E84E4]/40 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Create Proposed Event</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
