type SignalListener<T> = (arg: T) => void;

export class Signal<T> {
    private listeners: Set<SignalListener<T>> = new Set();

    addListener(listener: SignalListener<T>): void {
        this.listeners.add(listener);
    }

    removeListener(listener: SignalListener<T>): void {
        this.listeners.delete(listener);
    }

    emit(arg: T): void {
        for (const listener of this.listeners) {
            listener.call(null, arg);
        }
    }

    once(listener: SignalListener<T>): void {
        const wrapper = (arg: T) => {
            this.removeListener(wrapper);
            listener.call(null, arg);
        };
        this.addListener(wrapper);
    }

    on(listener: SignalListener<T>): void {
        this.addListener(listener);
    }

    off(listener: SignalListener<T>): void {
        this.removeListener(listener);
    }

    clear(): void {
        this.listeners.clear();
    }
}
