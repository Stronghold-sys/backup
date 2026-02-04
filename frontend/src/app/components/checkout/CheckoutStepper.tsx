import { MapPin, Truck, CreditCard, CheckCircle2 } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
}

interface CheckoutStepperProps {
  currentStep: number;
  completedSteps: number[];
}

export default function CheckoutStepper({
  currentStep,
  completedSteps,
}: CheckoutStepperProps) {
  const steps: Step[] = [
    {
      id: 1,
      title: 'Alamat Penerima',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: 2,
      title: 'Jasa Pengiriman',
      icon: <Truck className="w-5 h-5" />,
    },
    {
      id: 3,
      title: 'Pembayaran & Voucher',
      icon: <CreditCard className="w-5 h-5" />,
    },
  ];

  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (currentStep === stepId) return 'active';
    return 'inactive';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 -z-10" />
        <div
          className="absolute top-6 left-0 h-1 bg-gradient-to-r from-orange-500 to-pink-500 -z-10 transition-all duration-500"
          style={{
            width: `${((completedSteps.length + (currentStep > completedSteps.length ? 0.5 : 0)) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center ${!isLast ? 'flex-1' : ''}`}
            >
              {/* Circle */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                  status === 'completed'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                    : status === 'active'
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg animate-pulse'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Title */}
              <div className="text-center max-w-[120px]">
                <p
                  className={`text-xs font-medium ${
                    status === 'completed' || status === 'active'
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </p>
                {status === 'completed' && (
                  <p className="text-[10px] text-green-600 font-semibold mt-1">
                    ✓ Selesai
                  </p>
                )}
                {status === 'active' && (
                  <p className="text-[10px] text-orange-600 font-semibold mt-1">
                    ⏳ Sedang Diisi
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
