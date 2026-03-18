import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    let closed = false;
    render(
      <Modal isOpen={true} onClose={() => { closed = true; }} title="Test">
        <p>Content</p>
      </Modal>
    );
    // The X button is the only button in the modal header
    const closeBtn = document.querySelector('button');
    fireEvent.click(closeBtn!);
    expect(closed).toBe(true);
  });

  it('displays the title', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="My Custom Title">
        <p>Body</p>
      </Modal>
    );
    expect(screen.getByText('My Custom Title')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders title and subtitle', () => {
    render(<PageHeader title="Page Title" subtitle="Page description" />);
    expect(screen.getByText('Page Title')).toBeInTheDocument();
    expect(screen.getByText('Page description')).toBeInTheDocument();
  });

  it('renders action button when actionLabel and onAction are provided', () => {
    let clicked = false;
    render(
      <PageHeader 
        title="Title" 
        subtitle="Sub" 
        actionLabel="Add Item" 
        onAction={() => { clicked = true; }} 
      />
    );
    const btn = screen.getByText('Add Item');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(clicked).toBe(true);
  });

  it('does not render action button when actionLabel is not provided', () => {
    render(<PageHeader title="Title" subtitle="Sub" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('LoadingState', () => {
  it('renders the loading message', () => {
    render(<LoadingState message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });
});

describe('ErrorAlert', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ErrorAlert message={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders error message when provided', () => {
    render(<ErrorAlert message="Something went wrong!" />);
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('renders with the correct placeholder', () => {
    render(
      <SearchInput 
        placeholder="Search here..." 
        value="" 
        onChange={() => {}} 
      />
    );
    expect(screen.getByPlaceholderText('Search here...')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(
      <SearchInput 
        placeholder="Search..." 
        value="test query" 
        onChange={() => {}} 
      />
    );
    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    expect(input.value).toBe('test query');
  });

  it('calls onChange when user types', () => {
    let capturedValue = '';
    render(
      <SearchInput 
        placeholder="Search..." 
        value="" 
        onChange={(val) => { capturedValue = val; }} 
      />
    );
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(capturedValue).toBe('hello');
  });
});
