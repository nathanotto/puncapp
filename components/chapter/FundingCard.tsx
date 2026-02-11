import Link from 'next/link';

interface FundingCardProps {
  chapterId: string;
  chapterName: string;
  currentMonth: {
    monthly_cost: number;
    contributions_this_month: number;
    punc_support_this_month: number;
    balance_this_month: number;
  };
  lifetime: {
    lifetime_punc_support: number;
    lifetime_contributions: number;
    punc_relationship: number;
  };
  memberContributions?: number;
  outsideContributions?: number;
}

export function FundingCard({
  chapterId,
  chapterName,
  currentMonth,
  lifetime,
  memberContributions = 0,
  outsideContributions = 0,
}: FundingCardProps) {
  const monthlyCost = currentMonth.monthly_cost;
  const contributionsThisMonth = currentMonth.contributions_this_month;
  const puncSupportThisMonth = Math.abs(currentMonth.punc_support_this_month);

  const fundingPercentage = Math.min(100, (contributionsThisMonth / monthlyCost) * 100);
  const stillNeeded = Math.max(0, monthlyCost - contributionsThisMonth);

  // Status badge
  let statusBadge = {
    text: 'Needs Support',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  };

  if (contributionsThisMonth >= monthlyCost) {
    statusBadge = {
      text: 'Fully Funded',
      color: 'bg-green-100 text-green-800 border-green-300',
    };
  } else if (contributionsThisMonth > 0) {
    statusBadge = {
      text: 'Partially Funded',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
  }

  // PUNC relationship display
  const puncRelationship = lifetime.punc_relationship;
  const isNetGiver = puncRelationship > 0;
  const relationshipText = isNetGiver
    ? `+$${Math.abs(puncRelationship).toFixed(2)} (we give more)`
    : puncRelationship < 0
    ? `-$${Math.abs(puncRelationship).toFixed(2)} (we receive more)`
    : '$0 (balanced)';

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-burnt-orange/20">
      {/* Header */}
      <div className="border-b-2 border-burnt-orange/10 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-earth-brown">Chapter Funding</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>
        <p className="text-sm text-stone-gray">Only visible to leaders and contributing members</p>
      </div>

      {/* Current Month Section */}
      <div className="p-6 border-b-2 border-burnt-orange/10">
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-earth-brown">
              ${contributionsThisMonth.toFixed(2)}
            </span>
            <span className="text-stone-gray">of</span>
            <span className="text-2xl font-semibold text-stone-gray">
              ${monthlyCost.toFixed(2)}
            </span>
            <span className="text-stone-gray ml-auto">
              {fundingPercentage.toFixed(0)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                fundingPercentage >= 100
                  ? 'bg-green-500'
                  : fundingPercentage > 0
                  ? 'bg-yellow-500'
                  : 'bg-orange-400'
              }`}
              style={{ width: `${Math.min(100, fundingPercentage)}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-stone-gray">Covered by members:</span>
            <span className="font-semibold text-earth-brown">
              ${memberContributions.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-gray">Outside donations:</span>
            <span className="font-semibold text-earth-brown">
              ${outsideContributions.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-gray">PUNC support (so far):</span>
            <span className="font-semibold text-earth-brown">
              ${puncSupportThisMonth.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Support Button */}
        <Link
          href={`/chapters/${chapterId}/support`}
          className="block w-full text-center px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors"
        >
          Support Our Chapter
          {stillNeeded > 0 && (
            <span className="block text-sm font-normal mt-1">
              ${stillNeeded.toFixed(2)} still needed this month
            </span>
          )}
        </Link>
      </div>

      {/* Lifetime PUNC Relationship */}
      <div className="p-6 bg-warm-cream/30">
        <h3 className="font-semibold text-earth-brown mb-3">Our PUNC Relationship</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-gray">Lifetime support received:</span>
            <span className="font-semibold text-orange-700">
              ${Math.abs(lifetime.lifetime_punc_support).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-gray">Lifetime contributions:</span>
            <span className="font-semibold text-green-700">
              ${lifetime.lifetime_contributions.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-gray/30">
            <span className="font-semibold text-earth-brown">Balance:</span>
            <span className={`font-bold ${isNetGiver ? 'text-green-700' : puncRelationship < 0 ? 'text-orange-700' : 'text-stone-gray'}`}>
              {relationshipText}
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>How it works:</strong> PUNC covers any funding gap at month-end.
            {isNetGiver
              ? " Your chapter has contributed more than it's received — thank you!"
              : puncRelationship < 0
              ? " PUNC is glad to support your chapter as it grows."
              : " Your chapter is perfectly balanced with PUNC."}
          </p>
        </div>
      </div>
    </div>
  );
}
