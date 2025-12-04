import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface NeoLineChartProps {
    data: any[];
    dataKey: string;
    color?: string;
    height?: number;
}

export const NeoLineChart = ({ data, dataKey, color = '#000000', height = 100 }: NeoLineChartProps) => {
    return (
        <div style={{ height: height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '2px solid #000',
                            boxShadow: '4px 4px 0px #000',
                            fontWeight: 'bold',
                            borderRadius: '0px'
                        }}
                        itemStyle={{ color: '#000' }}
                        labelStyle={{ color: '#666', marginBottom: '5px' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={3}
                        dot={{ r: 4, stroke: '#000', strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: color }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
