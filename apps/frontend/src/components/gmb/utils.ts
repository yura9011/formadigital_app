
import { Business } from './types';

export const sortBusinesses = (businesses: Business[]): Business[] => {
    return [...businesses].sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));
};

export const exportToCSV = (businesses: Business[], fileName: string = 'competitor_analysis.csv') => {
    const headers = ['Rank', 'Name', 'Address', 'Rating', 'Review Count', 'Weighted Score', 'Website', 'Phone'];

    const rows = businesses.map((b, index) => [
        index + 1,
        `"${b.name.replace(/"/g, '""')}"`,
        `"${b.address.replace(/"/g, '""')}"`,
        b.rating,
        b.reviewCount,
        (b.weightedScore || 0).toFixed(4),
        b.website || '',
        b.phone || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
