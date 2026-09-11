/* How a condition compares.
 *
 * The model draws these as symbols. They are spelled out here because
 * a programme file is JSON and `"<="` in a string is easier to get
 * wrong than `lte` — and because `≤` in a file someone edits by hand
 * on a Windows laptop is a support call waiting to happen.
 *
 * `in` and `has` are the two that are not arithmetic: `in` asks
 * whether the subject is one of a list, `has` whether the subject is a
 * list containing the value. They are inverses, and both are needed
 * because either side can be the list.
 */
export type ConditionOperator =
    "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "has";
