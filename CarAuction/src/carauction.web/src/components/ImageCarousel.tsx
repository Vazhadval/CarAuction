import React, { useState } from 'react';
import { Carousel, Modal } from 'react-bootstrap';
import { CarImage } from '../types';
import { getAbsoluteImageUrl } from '../utils/imageHelper';

interface ImageCarouselProps {
  images: CarImage[];
  carName: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, carName }) => {
  const [index, setIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (selectedIndex: number) => {
    setIndex(selectedIndex);
  };

  // Find the primary image index or use 0
  const initialIndex = images.findIndex(img => img.isPrimary);
  
  const openFullscreen = () => {
    setShowModal(true);
  };

  const closeFullscreen = () => {
    setShowModal(false);
  };

  return (
    <>
      <div style={{ position: 'relative' }}>
        <Carousel 
          activeIndex={index} 
          onSelect={handleSelect}
          interval={null} // Don't auto-slide
          indicators={images.length > 1}
          controls={images.length > 1}
        >
          {images.map((image, idx) => (
            <Carousel.Item key={image.id || idx}>
              <img
                className="d-block w-100"
                src={getAbsoluteImageUrl(image.imageUrl)}
                alt={`${carName} - Image ${idx + 1}`}
                style={{ 
                  height: '400px', 
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
                onClick={openFullscreen}
              />
            </Carousel.Item>
          ))}
        </Carousel>
        
        {/* Fullscreen button */}
        <button 
          className="btn btn-light btn-sm" 
          style={{
            position: 'absolute',
            right: '10px',
            bottom: '10px',
            zIndex: 10,
            opacity: 0.8
          }}
          onClick={openFullscreen}
        >
          <i className="bi bi-fullscreen"></i> Fullscreen
        </button>
      </div>

      {/* Thumbnail navigation */}
      {images.length > 1 && (
        <div className="d-flex mt-2 overflow-auto" style={{ gap: '8px' }}>
          {images.map((image, idx) => (
            <img
              key={image.id || idx}
              src={getAbsoluteImageUrl(image.imageUrl)}
              alt={`${carName} - Thumbnail ${idx + 1}`}
              style={{ 
                width: '60px', 
                height: '45px', 
                objectFit: 'cover',
                cursor: 'pointer',
                border: index === idx ? '2px solid #0d6efd' : '1px solid #dee2e6',
                opacity: index === idx ? 1 : 0.7
              }}
              onClick={() => setIndex(idx)}
            />
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      <Modal show={showModal} onHide={closeFullscreen} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>{carName}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Carousel 
            activeIndex={index} 
            onSelect={handleSelect}
            interval={null}
            indicators={images.length > 1}
            controls={images.length > 1}
          >
            {images.map((image, idx) => (
              <Carousel.Item key={image.id || idx}>
                <div style={{ height: '70vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    className="d-block"
                    src={getAbsoluteImageUrl(image.imageUrl)}
                    alt={`${carName} - Image ${idx + 1}`}
                    style={{ 
                      maxHeight: '70vh', 
                      maxWidth: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </Carousel.Item>
            ))}
          </Carousel>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ImageCarousel;
