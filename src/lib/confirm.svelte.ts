export interface ConfirmRequest {
	title: string;
	message: string;
	confirmLabel: string;
	resolve: (ok: boolean) => void;
}

// The native confirm() cannot be styled and prints the page origin as its title.
class Confirmer {
	request = $state.raw<ConfirmRequest | null>(null);

	ask(title: string, message: string, confirmLabel: string): Promise<boolean> {
		this.request?.resolve(false);
		return new Promise((resolve) => {
			this.request = { title, message, confirmLabel, resolve };
		});
	}

	answer(ok: boolean): void {
		const request = this.request;
		this.request = null;
		request?.resolve(ok);
	}
}

export const confirmer = new Confirmer();
