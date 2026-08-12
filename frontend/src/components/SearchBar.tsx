import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input } from "./ui/input";

type SearchType = "all" | "stories" | "users" | "tags";

interface SearchBoxProps {
  query?: string;
  type?: SearchType;
}

export default function SearchBox({
  query = "",
  type = "all",
}: SearchBoxProps) {
  const navigate = useNavigate();
  const [input, setInput] = useState(query);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const value = input.trim();

    if (value.length < 2) return;

    navigate(`/search?q=${encodeURIComponent(value)}&type=${type}`);
  }

  return (
    <form className="search-box" role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor="search-query">
        عبارت جست‌وجو
      </label>
      <Field orientation="horizontal">
        <Input
          type="search"
          placeholder="داستان - نویسنده - ژانر"
          minLength={2}
          maxLength={100}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <Button>جستجو</Button>
      </Field>

      <button className="button" type="submit">
        جست‌وجو
      </button>
    </form>
  );
}
