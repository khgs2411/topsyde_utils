import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";

/**
 * Custom validator for number | number[] type
 * Validates that value is either a single number or a 2-element number array [min, max]
 */

@ValidatorConstraint({ name: "isNumberOrRange", async: false })
export class IsNumberOrRangeConstraint implements ValidatorConstraintInterface {
	validate(value: any, args: ValidationArguments) {
		// Allow single number
		if (typeof value === "number" && !isNaN(value)) {
			return true;
		}

		// Allow array of exactly 2 numbers (range)
		if (Array.isArray(value)) {
			if (value.length !== 2) return false;
			if (typeof value[0] !== "number" || isNaN(value[0])) return false;
			if (typeof value[1] !== "number" || isNaN(value[1])) return false;
			// Optional: Validate min <= max
			if (value[0] > value[1]) return false;
			return true;
		}

		return false;
	}

	defaultMessage(args: ValidationArguments) {
		return "Value must be a number or a 2-element number array [min, max]";
	}
}
