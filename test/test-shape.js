import expect from "expect.js";
import sinon from "sinon";
import mockfs from "mock-fs";
import {open, validate} from "@zingle/shape";

describe("validate(value, schema, ...keys)", () => {
  describe("when schema is Boolean", () => {
    it("should return value if value is boolean", () => {
      const value = true;
      expect(validate(value, Boolean)).to.be(value);
    });

    it("should throw if value is not boolean", () => {
      expect(() => validate(undefined, Boolean)).to.throwError();
      expect(() => validate(null, Boolean)).to.throwError();
      expect(() => validate(42, Boolean)).to.throwError();
      expect(() => validate("foo", Boolean)).to.throwError();
      expect(() => validate(new Boolean(true), Boolean)).to.throwError();
    });
  });

  describe("when schema is Number", () => {
    it("should return value if value is number", () => {
      const value = 42;
      expect(validate(value, Number)).to.be(value);
    });

    it("should throw if value is not number", () => {
      expect(() => validate(undefined, Number)).to.throwError();
      expect(() => validate(null, Number)).to.throwError();
      expect(() => validate(true, Number)).to.throwError();
      expect(() => validate("foo", Number)).to.throwError();
      expect(() => validate(new Number(true), Number)).to.throwError();
    });
  });

  describe("when schema is String", () => {
    it("should return value if value is string", () => {
      const value = "foo bar";
      expect(validate(value, String)).to.be(value);
    });

    it("should throw if value is not string", () => {
      expect(() => validate(undefined, String)).to.throwError();
      expect(() => validate(null, String)).to.throwError();
      expect(() => validate(true, String)).to.throwError();
      expect(() => validate(42, String)).to.throwError();
      expect(() => validate({toString:()=>"foo"}, String)).to.throwError();
      expect(() => validate(new String("foo"), String)).to.throwError();
    });
  });

  describe("when schema is a boolean", () => {
    const schema = false;

    it("should return value if value is boolean", () => {
      const value = true;
      expect(validate(value, schema)).to.be(value);
    });

    it("should return schema if value not set", () => {
      expect(validate(undefined, schema)).to.be(schema);
    });

    it("should throw if value is set and is not boolean", () => {
      expect(() => validate(null, schema)).to.throwError();
      expect(() => validate(0, schema)).to.throwError();
      expect(() => validate("", schema)).to.throwError();
      expect(() => validate(new Boolean(true), schema)).to.throwError();
    });
  });

  describe("when schema is a string", () => {
    const schema = "foo bar";

    it("should return value if value is string", () => {
      const value = "foo";
      expect(validate(value, schema)).to.be(value);
    });

    it("should return schema if value not set", () => {
      expect(validate(undefined, schema)).to.be(schema);
    });

    it("should throw if value is set and is not string", () => {
      expect(() => validate(null, schema)).to.throwError();
      expect(() => validate(false, schema)).to.throwError();
      expect(() => validate(0, schema)).to.throwError();
      expect(() => validate(new String(""), schema)).to.throwError();
    });
  });

  describe("when schema is a number", () => {
    const schema = 42;

    it("should return value if value is number", () => {
      const value = 23;
      expect(validate(value, schema)).to.be(value);
    });

    it("should return schema if value not set", () => {
      expect(validate(undefined, schema)).to.be(schema);
    });

    it("should throw if value is set and is not number", () => {
      expect(() => validate(null, schema)).to.throwError();
      expect(() => validate(false, schema)).to.throwError();
      expect(() => validate("", schema)).to.throwError();
      expect(() => validate(new Number(0), schema)).to.throwError();
    });
  });

  describe("when schema is a single-element array", () => {
    const schema = [String];

    it("should return copy of validated values", () => {
      const values = ["foo", "bar", "baz"];
      const validated = validate(values, schema);

      expect(validated).to.be.an("array");
      expect(validated.length).to.be(values.length);
      expect(JSON.stringify(validated)).to.be(JSON.stringify(values));
    });

    it("should throw if invalid value included", () => {
      const values = ["foo", 42, "bar"];

      expect(() => validate(values, schema)).to.throwError();
    });
  });

  describe("when schema is an object", () => {
    const schema = {foo: {bar: String}, baz: 42};

    it("should return copy of validated values", () => {
      const object = {foo: {bar: "biff"}};
      const validated = validate(object, schema);

      expect(validated).to.not.be(object);
      expect(validated).to.be.an("object");
      expect(validated.foo).to.be.an("object");
      expect(validated.foo.bar).to.be(object.foo.bar);
      expect(validated.baz).to.be(schema.baz);
    });

    it("should setup inheritance between nested objects", () => {
      const object = {foo: {bar: "biff"}};
      const validated = validate(object, schema);

      expect(validated.foo.baz).to.be(schema.baz);
    });
  });

  describe("when schema is a function", () => {
    let value, ok, fail;

    beforeEach(() => {
      value = Symbol();
      ok = sinon.spy(() => true);
      fail = sinon.spy(() => false);
    });

    it("should pass the value to the function", () => {
      validate(value, ok);
      expect(ok.calledOnce).to.be(true);
      expect(ok.calledWith(value)).to.be(true);
    });

    it("should return the value if function returns true", () => {
      expect(validate(value, ok)).to.be(value);
    });

    it("should throw if the function returns false", () => {
      expect(() => validate(value, fail)).to.throwError();
    });
  });

  describe("when error is thrown", () => {
    it("should include the context keys", () => {
      try {
        validate(null, String, "bar", "foo");
      } catch (err) {
        expect(err.message).to.contain("foo.bar");
      }
    });
  });
});

describe("open(path, schema)", () => {
  const schema = {foo: Number, bar: {baz: Number, biff: 13}};

  beforeEach(() => {
    mockfs({
      file: JSON.stringify({foo: 42, bar: {baz: 23}}),
      invalid: "foo\n"
    });
  });

  afterEach(() => {
    mockfs.restore();
  });

  it("should read file and validate against schema", async () => {
    const result = await open("file", schema);

    expect(result).to.be.an("object");
    expect(result.foo).to.be(42);
    expect(result.bar).to.be.an("object");
    expect(result.bar.foo).to.be(42);
    expect(result.bar.baz).to.be(23);
  });

  it("should accept missing file if schema allows it", async () => {
    const result = await open("nofile", {foo: 42});

    expect(result).to.be.an("object");
    expect(result.foo).to.be(42);
  });

  it("should reject file that isn't valid JSON", async () => {
    let error;

    try {
      await open("invalid", {foo: 42});
    } catch (err) {
      error = err;
    }

    expect(error).to.be.an(Error);
  });

  it("should include path in error", async () => {
    let error;

    try {
      await open("file", {invalid: Boolean});
    } catch (err) {
      error = err;
    }

    expect(error.message).to.contain("file:.invalid");
  });
});
