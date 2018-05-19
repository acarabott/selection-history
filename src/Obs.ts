export type subscription = ((value: any) => void);

export class Obs {
  protected _value: any;
  protected subscriptions: subscription[];
  constructor(value?: any) {
    this._value = value;
    this.subscriptions = [];
  }

  get value() { return this._value; }
  set value(value) {
    this._value = value;
    this.notify();
  }

  setValueWithoutNotify(value: any) { this._value = value; }

  subscribe(func: subscription) {
    this.subscriptions.push(func);
  }

  unsubscribe(func: subscription) {
    this.subscriptions = this.subscriptions.filter(_func => _func !== func);
  }

  notify() {
    this.subscriptions.forEach(subscription => subscription(this.value));
  }
}

export function observable(obj: {}, key: string) {
  const obs = new Obs();
  Object.defineProperty(obj, `${key}Obs`, {
    get() { return obs; }
  });

  Object.defineProperty(obj, key, {
    get()      { return obs.value;  },
    set(value) { obs.value = value; }
  });
}
