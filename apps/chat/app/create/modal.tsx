import React from 'react';
import { Button, Icon } from 'ucom';

export const Modal = ({ icon, title, description, open, close, children, disableFeature }) => {
    if (!open) return null;

    return (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-700/75 transition-opacity" aria-hidden="true" />
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0" onClick={(e) => e.stopPropagation()}>
                    <div className="relative transform overflow-hidden border-2 bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg pb-6 pt-2">
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            {/* <Icon icon="Close" className="size-5 text-gray-900 hover:text-gray-500 cursor-pointer absolute top-4 right-4" onClick={close} /> */}
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex size-12 shrink-0 items-center justify-center sm:mx-0 sm:size-14">
                                    <Icon icon={icon} className='size-10 -mt-2 text-gray-900' />
                                </div>
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                    <h3 className="text-base font-semibold text-gray-900" id="modal-title">{title}</h3>
                                    <div className="mt-1 mb-4">
                                        <p className="text-sm text-gray-500">{description}</p>
                                    </div>
                                    {children}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <Button type="button" className="ml-2" variant="secondary" onClick={close}>Save & Close</Button>
                            <Button type="button" onClick={disableFeature}>Disable Feature</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};