'use client';

import React, { useState, useEffect } from 'react';

interface Review {
  reviewId: string;
  locationId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: number;
  comment: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string } | null;
}

interface Location {
  id: string;
  locationId: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  pendingReplies: number;
  ratingDistribution: Record<number, number>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';

export default function ReviewsTab() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'replied'>('all');

  useEffect(() => { fetchLocations(); }, []);
  useEffect(() => {
    if (selectedLocation) { fetchReviews(selectedLocation); fetchStats(selectedLocation); }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/gbp/locations`);
      const data = await res.json();
      setLocations(data);
      if (data.length > 0) setSelectedLocation(data[0].locationId);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchReviews = async (locationId: string) => {
    const res = await fetch(`${API_BASE}/gbp/reviews?locationId=${locationId}`);
    const data = await res.json();
    setReviews(data.reviews || []);
  };

  const fetchStats = async (locationId: string) => {
    const res = await fetch(`${API_BASE}/gbp/reviews/stats?locationId=${locationId}`);
    setStats(await res.json());
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    const res = await fetch(`${API_BASE}/gbp/reviews/${reviewId}/reply?locationId=${selectedLocation}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyText }),
    });
    const data = await res.json();
    if (data.success) {
      setReviews(reviews.map(r => r.reviewId === reviewId ? { ...r, reviewReply: data.reply } : r));
      setReplyingTo(null); setReplyText('');
    }
  };

  const generateSuggestion = async (review: Review) => {
    const res = await fetch(`${API_BASE}/gbp/reviews/${review.reviewId}/suggest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review),
    });
    const data = await res.json();
    setReplyText(data.suggestion);
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'pending' && r.reviewReply) return false;
    if (filter === 'replied' && !r.reviewReply) return false;
    return true;
  });

  const renderStars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const getTimeAgo = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  };

  if (loading) return <div className="p-8 text-center font-bold">Loading reviews...</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b-4 border-black">
        <h2 className="text-2xl font-black uppercase">📝 Review Management</h2>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-4 py-2 border-2 border-black font-bold bg-white"
        >
          {locations.map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border-2 border-black shadow-neo p-4 text-center">
            <div className="text-3xl font-black">{stats.totalReviews}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Total Reviews</div>
          </div>
          <div className="bg-white border-2 border-black shadow-neo p-4 text-center">
            <div className="text-3xl font-black">{stats.averageRating.toFixed(1)}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Avg Rating</div>
          </div>
          <div className="bg-red-100 border-2 border-black shadow-neo p-4 text-center border-l-4 border-l-red-500">
            <div className="text-3xl font-black">{stats.pendingReplies}</div>
            <div className="text-sm font-bold uppercase text-gray-600">Pending</div>
          </div>
          <div className="bg-white border-2 border-black shadow-neo p-4">
            <div className="text-xs font-bold uppercase mb-2">Distribution</div>
            {[5, 4, 3, 2, 1].map(r => (
              <div key={r} className="flex items-center gap-2 text-xs">
                <span>{r}★</span>
                <div className="flex-1 h-2 bg-gray-200 border border-black">
                  <div className="h-full bg-yellow-400" style={{ width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[r] / stats.totalReviews) * 100 : 0}%` }} />
                </div>
                <span>{stats.ratingDistribution[r]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'replied'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 border-2 border-black font-bold uppercase text-sm ${filter === f ? 'bg-neo-blue text-white shadow-neo' : 'bg-white'}`}
          >
            {f} ({f === 'all' ? reviews.length : f === 'pending' ? reviews.filter(r => !r.reviewReply).length : reviews.filter(r => r.reviewReply).length})
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 font-bold">No reviews match your filter</div>
        ) : filteredReviews.map(review => (
          <div key={review.reviewId} className={`bg-white border-2 border-black shadow-neo p-4 ${review.starRating <= 2 ? 'border-l-4 border-l-red-500' : ''}`}>
            <div className="flex items-center gap-4 mb-3">
              <img src={review.reviewer.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.reviewer.displayName)}&background=random`}
                alt="" className="w-10 h-10 rounded-full border-2 border-black" />
              <div className="flex-1">
                <div className="font-bold">{review.reviewer.displayName}</div>
                <div className="text-sm text-gray-500">{getTimeAgo(review.createTime)}</div>
              </div>
              <div className={`text-lg ${review.starRating >= 4 ? 'text-green-500' : review.starRating <= 2 ? 'text-red-500' : 'text-yellow-500'}`}>
                {renderStars(review.starRating)}
              </div>
            </div>
            <p className="mb-4 text-gray-800">{review.comment}</p>

            {review.reviewReply ? (
              <div className="bg-green-50 border-2 border-black border-l-4 border-l-green-500 p-3">
                <div className="text-xs font-bold uppercase text-green-700 mb-1">Your Reply:</div>
                <p className="text-sm">{review.reviewReply.comment}</p>
              </div>
            ) : replyingTo === review.reviewId ? (
              <div className="border-2 border-black p-3">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-2 border-2 border-black mb-2 font-medium" rows={3} placeholder="Write your reply..." />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => generateSuggestion(review)} className="px-3 py-1 border-2 border-black bg-yellow-300 font-bold text-sm">✨ AI Suggest</button>
                  <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="px-3 py-1 border-2 border-black bg-gray-200 font-bold text-sm">Cancel</button>
                  <button onClick={() => handleReply(review.reviewId)} className="px-3 py-1 border-2 border-black bg-neo-blue text-white font-bold text-sm">Send</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setReplyingTo(review.reviewId)} className="px-4 py-2 border-2 border-black bg-neo-blue text-white font-bold text-sm uppercase">
                Reply to Review
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
