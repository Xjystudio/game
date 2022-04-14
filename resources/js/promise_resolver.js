var PromiseResolver = class {
  constructor() {
    this.resolve_;
    this.reject_;
    this.isFulfilled_ = false;
    this.promise_ = new Promise((resolve, reject) => {
      this.resolve_ =  (resolution) => {
        resolve(resolution);
        this.isFulfilled_ = true;
      };
      this.reject_ =  (reason) => {
        reject(reason);
        this.isFulfilled_ = true;
      };
    });
  }

  get isFulfilled() {
    return this.isFulfilled_;
  }

  set isFulfilled(i) {
    assertNotReached();
  }

  /** @return {!Promise<T>} */
  get promise() {
    return this.promise_;
  }

  set promise(p) {
    assertNotReached();
  }

  /** @return {function(T=): void} */
  get resolve() {
    return this.resolve_;
  }

  set resolve(r) {
    assertNotReached();
  }

  /** @return {function(*=): void} */
  get reject() {
    return this.reject_;
  }

  set reject(s) {
    assertNotReached();
  }
};
console.warn('crbug/1173575, non-JS module files deprecated.');