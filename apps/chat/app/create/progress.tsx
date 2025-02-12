import React from 'react';
import { Icon } from 'ucom';

interface ProgressProps {
  steps: {
    title: string;
    Icon: string;
    description: string;
  }[];
  currentStep: number;
}

const Progress: React.FC<ProgressProps> = ({ steps, currentStep }) => {
  const getStepClass = (step: number) =>
    currentStep > step ? "bg-[#0E468A] text-[#CBE2F7]" : "bg-[#CBE2F7] text-[#0E468A] border-2 border-[#CBE2F7]";

  return steps.length > 0 ? (
    <div className="w-full">
      <div className="flex justify-center">
        {steps.map((step, index) => (
          <div key={index} className="w-1/3">
            <div className="relative mb-2">
              {index > 0 && (
                <div
                  className="absolute flex align-center items-center align-middle content-center"
                  style={{
                    width: "calc(100% - 2.5rem - 1rem)",
                    top: "50%",
                    transform: "translate(-50%, -50%)"
                  }}
                >
                  <div className="w-full bg-[#CBE2F7] rounded items-center align-middle align-center flex-1">
                    <div
                      className="w-0 bg-[#0E468A] py-1 rounded"
                      style={{ width: index < currentStep ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              )}
              <div className={`w-10 h-10 mx-auto ${getStepClass(index)} rounded-full text-lg flex items-center`}>
                <span className="text-center w-full">
                  <Icon icon={step.Icon} className="size-5 mx-auto" />
                </span>
              </div>
            </div>
            <div className="text-xs text-[#CBE2F7] text-center md:text-base">{step.title}</div>
          </div>
        ))}
      </div>
    </div>
  ) : null;
};

export default Progress;
