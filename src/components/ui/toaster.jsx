import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, AlertTriangle } from 'lucide-react'; // Import success and error icons
import React from 'react';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(({ id, title, description, action, variant, ...props }) => {
				// Determine the icon based on the variant
				const icon = variant === 'success' ? (
					<CheckCircle className="h-5 w-5 text-green-500 mr-2" />
				) : variant === 'destructive' ? (
					<AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
				) : null;

				// Determine the text color based on the variant
				const titleColor = variant === 'success' ? 'text-green-500' : variant === 'destructive' ? 'text-red-500' : 'text-white';

				return (
					<Toast key={id} {...props}>
						<div className="flex items-center">
							{icon}
							<div className="grid gap-1">
								{title && <ToastTitle className={titleColor}>{title}</ToastTitle>}
								{description && (
									<ToastDescription>{description}</ToastDescription>
								)}
							</div>
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}
