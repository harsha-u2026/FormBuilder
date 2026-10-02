"""
Conditional logic engine for evaluating question visibility rules.
Supports operators: equals, not_equals, contains, not_contains, greater_than, less_than, is_empty, is_not_empty.
"""
from typing import Any, Dict, List, Optional


def _normalize_value(val: Any) -> Any:
    if val is None:
        return ""
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val
    return str(val).strip()


def evaluate_single_condition(condition: Dict[str, Any], answers: Dict[str, Any]) -> bool:
    target_field_id = condition.get("field_id")
    if not target_field_id:
        return True

    op = condition.get("operator", "equals").lower()
    expected = condition.get("value")

    raw_val = answers.get(str(target_field_id))

    if op == "is_empty":
        return raw_val is None or raw_val == "" or (isinstance(raw_val, list) and len(raw_val) == 0)

    if op == "is_not_empty":
        return raw_val is not None and raw_val != "" and (not isinstance(raw_val, list) or len(raw_val) > 0)

    # If answer is absent and op is equality/contains, it doesn't match
    if raw_val is None:
        return op == "not_equals" or op == "not_contains"

    # Multi-select or checkbox answers are lists
    if isinstance(raw_val, list):
        norm_expected = str(expected).strip().lower() if expected is not None else ""
        norm_list = [str(item).strip().lower() for item in raw_val]

        if op == "contains":
            return norm_expected in norm_list
        if op == "not_contains":
            return norm_expected not in norm_list
        if op == "equals":
            return norm_list == [norm_expected]
        if op == "not_equals":
            return norm_list != [norm_expected]
        return False

    # Boolean values (e.g. switch, yes/no)
    if isinstance(raw_val, bool):
        exp_bool = None
        if isinstance(expected, bool):
            exp_bool = expected
        elif str(expected).lower() in ["true", "yes", "1"]:
            exp_bool = True
        elif str(expected).lower() in ["false", "no", "0"]:
            exp_bool = False

        if exp_bool is not None:
            if op == "equals":
                return raw_val is exp_bool
            if op == "not_equals":
                return raw_val is not exp_bool
        return False

    # Numeric comparisons
    if op in ["greater_than", "less_than"]:
        try:
            num_actual = float(raw_val)
            num_expected = float(expected)
            if op == "greater_than":
                return num_actual > num_expected
            if op == "less_than":
                return num_actual < num_expected
        except (ValueError, TypeError):
            return False

    # String / generic comparison
    str_actual = str(raw_val).strip().lower()
    str_expected = str(expected).strip().lower() if expected is not None else ""

    if op == "equals":
        return str_actual == str_expected
    if op == "not_equals":
        return str_actual != str_expected
    if op == "contains":
        return str_expected in str_actual
    if op == "not_contains":
        return str_expected not in str_actual

    return True


def is_field_visible(field_rules: Optional[Dict[str, Any]], answers: Dict[str, Any]) -> bool:
    """
    Evaluates whether a field should be shown or hidden based on conditional rules and current answers.
    Default is visible (True) if no rules are defined.
    """
    if not field_rules or not isinstance(field_rules, dict):
        return True

    conditions = field_rules.get("conditions")
    if not conditions or not isinstance(conditions, list):
        return True

    valid_conditions = [c for c in conditions if isinstance(c, dict) and c.get("field_id")]
    if not valid_conditions:
        return True

    logic_type = field_rules.get("logic_type", "all").lower()  # "all" (AND) or "any" (OR)
    action = field_rules.get("action", "show").lower()  # "show" or "hide"

    results = [evaluate_single_condition(cond, answers) for cond in valid_conditions]

    matched = all(results) if logic_type == "all" else any(results)

    if action == "hide":
        return not matched
    # default action is "show"
    return matched
