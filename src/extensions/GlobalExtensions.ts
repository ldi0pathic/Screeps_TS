export function conditionalLog(condition: boolean | (() => boolean), message: string): void {
    const isConditionMet = typeof condition === 'function' ? condition() : condition;

    if (isConditionMet) {
        console.log(message);
    }
}  

