export type subscription = ((value: any) => void);

export class Obs<T> {
  protected _value: T;
  protected subscriptions: ((value: T) => void)[];
  constructor(value: T) {
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
