import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: number;
}

interface AlertSystemProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({ alerts, onDismiss }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_fuel':
      case 'tire_wear':
      case 'engine_temp':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'pace':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'weather':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'strategy':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'low_fuel':
      case 'tire_wear':
      case 'engine_temp':
        return 'border-red-500 bg-red-900/20';
      case 'pace':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'weather':
        return 'border-blue-500 bg-blue-900/20';
      case 'strategy':
        return 'border-green-500 bg-green-900/20';
      default:
        return 'border-gray-500 bg-gray-900/20';
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-6 z-50 space-y-2 max-w-sm">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start space-x-3 p-4 rounded-lg border ${getAlertColor(alert.type)} animate-in slide-in-from-right duration-300`}
        >
          {getAlertIcon(alert.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{alert.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
